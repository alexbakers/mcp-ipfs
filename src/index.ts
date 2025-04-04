#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as Schemas from "./schemas.js";
import { toolHandlers } from "./tool_handlers.js";
import { logger } from "./utils/logger.js";

// Helper type for converting Zod schema to JSON schema expected by MCP
type ToolInputSchema = Exclude<
  z.infer<typeof ToolSchema.shape.inputSchema>,
  undefined
>;

async function main() {
  logger.info("Starting mcp-ipfs server (storacha.network via w3cli)...");

  const loginEmail = process.env["W3_LOGIN_EMAIL"];
  if (!loginEmail) {
    logger.error("Missing environment variable W3_LOGIN_EMAIL. Exiting.");
    process.exit(1);
  }

  const server = new Server(
    {
      name: "mcp-ipfs",
      version: "0.1.5",
    },
    {
      capabilities: { tools: {} },
    }
  );

  // ListTools Handler: Dynamically generates tool list from schemas
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Object.entries(Schemas)
      .filter(([name, schema]) => {
        return name.endsWith("ArgsSchema") && schema instanceof z.ZodType;
      })
      .map(([schemaName, schema]) => {
        const toolName = schemaName
          .replace(/([A-Z])/g, "_$1")
          .replace("_Args_Schema", "")
          .toLowerCase()
          .substring(1);

        let description =
          schema.description ?? `Tool for ${toolName} operation.`;

        // Special description overrides for enhanced clarity
        if (toolName === "w3_login") {
          description =
            "Initiates the w3 login process using the pre-configured email (W3_LOGIN_EMAIL env var). NOTE: The command waits for email validation. Highlight to the user that they MUST check email to complete authentication. If the final output includes 'Agent was authorized by', the user has already clicked the link and is successfully authorized.";
        }
        if (toolName === "w3_space_info" || toolName === "w3_space_ls") {
          description +=
            ' NOTE: `no current space and no space given` or `{"spaces":[]}` first make sure you are logged in before using other tools.';
        }
        if (toolName === "w3_space_create") {
          description +=
            " NOTE: `w3 space create` cannot be run via MCP due to interactive recovery key prompts. Please run this command manually in your terminal.";
        }
        if (
          [
            "w3_up",
            "w3_delegation_create",
            "w3_delegation_revoke",
            "w3_proof_add",
            "w3_can_blob_add",
            "w3_can_store_add",
          ].includes(toolName)
        ) {
          description += " Requires ABSOLUTE paths for file arguments.";
        }

        return {
          name: toolName,
          description: description.trim(),
          inputSchema: zodToJsonSchema(schema) as ToolInputSchema,
        };
      });

    return { tools };
  });

  // CallTool Handler: Routes requests to specific tool implementations
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Handling CallTool request for: ${name}`);

    const handler = toolHandlers[name];

    if (!handler) {
      logger.error(`Unknown tool requested: ${name}`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await handler(args);
      return result;
    } catch (error: any) {
      logger.error(`Error handling tool '${name}':`, error);
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: error.message }) },
        ],
        isError: true,
      };
    }
  });

  // Connect server to standard I/O transport
  logger.info("Connecting MCP transport (stdio)...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(
    "mcp-ipfs server (storacha.network / w3cli) connected and listening on stdio."
  );
}

// Start the server
main().catch((error) => {
  logger.error("Unhandled error during server startup or execution:", error);
  process.exit(1);
});
