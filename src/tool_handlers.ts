import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import * as Schemas from "./schemas.js";
import { parseNdJson, runW3Command } from "./utils.js";
import { logger } from "./utils/logger.js";

// Type for the arguments object within a CallToolRequest
type ToolArgs = CallToolRequest["params"]["arguments"];

// Define the structure for content parts (adjust if specific types like TextContent are available)
type ContentPart = { type: string; [key: string]: any };

// Define the structure of the response object expected by the MCP handler
type ToolHandlerResponse = {
  content: ContentPart[];
  isError?: boolean;
};

// Generic type for a tool handler function
type ToolHandler = (args: ToolArgs) => Promise<ToolHandlerResponse>;

// Tool Handler Implementations

const handleW3Login: ToolHandler = async (_args) => {
  const loginEmail = process.env["W3_LOGIN_EMAIL"]; // Checked at startup
  logger.info(
    `Initiating login for ${loginEmail}. User MUST check email to authorize.`
  );
  const { stdout, stderr } = await runW3Command(`login ${loginEmail!}`);
  const output = `Login process initiated for ${loginEmail!}. Output from w3:\nStdout: ${stdout}\nStderr: ${stderr}\nPlease check your email to complete the login.`;
  return {
    content: [{ type: "text", text: JSON.stringify({ message: output }) }],
  };
};

const handleW3SpaceLs: ToolHandler = async (_args) => {
  const parsed = Schemas.W3SpaceLsArgsSchema.safeParse(_args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_space_ls: ${parsed.error.message}`
    );

  const { stdout } = await runW3Command("space ls");
  const spaces: {
    did: string;
    name: string | undefined;
    isCurrent: boolean;
  }[] = [];
  const lines = stdout.trim().split("\n");

  for (const line of lines) {
    let trimmedLine = line.trim();
    if (!trimmedLine) continue;
    let isCurrent = false;
    if (trimmedLine.startsWith("*")) {
      isCurrent = true;
      trimmedLine = trimmedLine.substring(1).trim();
    }
    const parts = trimmedLine.split(/\s+/);
    const did = parts[0];
    const name = parts.length > 1 ? parts.slice(1).join(" ") : undefined;
    if (did && did.startsWith("did:key:")) {
      spaces.push({ did, name, isCurrent });
    }
  }
  return {
    content: [{ type: "text", text: JSON.stringify({ spaces }) }],
  };
};

const handleW3SpaceUse: ToolHandler = async (args) => {
  const parsed = Schemas.W3SpaceUseArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_space_use: ${parsed.error.message}`
    );
  const { spaceDid } = parsed.data;
  const { stdout } = await runW3Command(`space use ${spaceDid}`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Successfully set current space to ${spaceDid}`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3SpaceCreate: ToolHandler = async (_args) => {
  throw new Error(
    "`w3 space create` cannot be run via MCP due to interactive recovery key prompts. Please run this command manually in your terminal."
  );
};

const handleW3Up: ToolHandler = async (args) => {
  const parsed = Schemas.W3UpArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(`Invalid arguments for w3_up: ${parsed.error.message}`);
  const { paths, noWrap, hidden } = parsed.data;
  const quotedPaths = paths.map((p) => `"${p}"`).join(" ");
  let command = `up ${quotedPaths}`;
  if (noWrap) command += " --no-wrap";
  if (hidden) command += " --hidden";
  const { stdout } = await runW3Command(command);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: "Upload successful.",
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3Ls: ToolHandler = async (args) => {
  const parsed = Schemas.W3LsArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(`Invalid arguments for w3_ls: ${parsed.error.message}`);
  const { json } = parsed.data;
  const command = json ? "ls --json" : "ls";
  const { stdout } = await runW3Command(command);
  if (json) {
    const uploads = parseNdJson(stdout);
    return {
      content: [{ type: "text", text: JSON.stringify({ uploads }) }],
    };
  } else {
    return {
      content: [
        { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
      ],
    };
  }
};

const handleW3Rm: ToolHandler = async (args) => {
  const parsed = Schemas.W3RmArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(`Invalid arguments for w3_rm: ${parsed.error.message}`);
  const { cid, removeShards } = parsed.data;
  let command = `rm ${cid}`;
  if (removeShards) command += " --shards";
  const { stdout } = await runW3Command(command);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Successfully removed listing for CID ${cid}.`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3Open: ToolHandler = async (args) => {
  const parsed = Schemas.W3OpenArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(`Invalid arguments for w3_open: ${parsed.error.message}`);
  const { cid, path } = parsed.data;
  const baseUrl = "https://w3s.link/ipfs/";
  const fullPath = path ? `${cid}/${path}` : cid;
  const url = `${baseUrl}${fullPath}`;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `To view the content, open this URL in your browser: ${url}`,
          url: url,
        }),
      },
    ],
  };
};

const handleW3SpaceInfo: ToolHandler = async (args) => {
  const parsed = Schemas.W3SpaceInfoArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_space_info: ${parsed.error.message}`
    );
  const { spaceDid, json } = parsed.data;
  let command = "space info";
  if (spaceDid) command += ` --space ${spaceDid}`;
  if (json) command += " --json";
  const { stdout } = await runW3Command(command);
  if (json) {
    try {
      const info = parseNdJson(stdout);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ spaceInfo: info.length > 0 ? info[0] : {} }),
          },
        ],
      };
    } catch (e) {
      try {
        const singleInfo = JSON.parse(stdout);
        return {
          content: [
            { type: "text", text: JSON.stringify({ spaceInfo: singleInfo }) },
          ],
        };
      } catch (e2) {
        logger.warn(
          `w3_space_info: Failed to parse output as NDJSON or JSON: ${stdout}`
        );
        throw new Error(
          `Failed to parse JSON output for w3_space_info. Raw output: ${stdout}`
        );
      }
    }
  } else {
    return {
      content: [
        { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
      ],
    };
  }
};

const handleW3SpaceAdd: ToolHandler = async (args) => {
  const parsed = Schemas.W3SpaceAddArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_space_add: ${parsed.error.message}`
    );
  const { proof } = parsed.data;
  const { stdout } = await runW3Command(`space add "${proof}"`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: "Space added successfully from proof.",
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3DelegationCreate: ToolHandler = async (args) => {
  const parsed = Schemas.W3DelegationCreateArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_delegation_create: ${parsed.error.message}`
    );
  const {
    audienceDid,
    capabilities,
    name: delName,
    type,
    output: outFile,
    base64,
  } = parsed.data;
  let command = `delegation create ${audienceDid}`;
  capabilities.forEach((cap) => {
    command += ` --can '${cap}'`;
  });
  if (delName) command += ` --name "${delName}"`;
  if (type) command += ` --type ${type}`;
  if (outFile) command += ` --output "${outFile}"`;
  if (base64) command += ` --base64`;
  const { stdout } = await runW3Command(command);
  const message = base64
    ? "Delegation created successfully (base64 output)."
    : `Delegation created successfully (output file: ${outFile}).`;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ message: message, output: stdout.trim() }),
      },
    ],
  };
};

const handleW3DelegationLs: ToolHandler = async (args) => {
  const parsed = Schemas.W3DelegationLsArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_delegation_ls: ${parsed.error.message}`
    );
  const { json } = parsed.data;
  const command = json ? "delegation ls --json" : "delegation ls";
  const { stdout } = await runW3Command(command);
  if (json) {
    const delegations = parseNdJson(stdout);
    return {
      content: [{ type: "text", text: JSON.stringify({ delegations }) }],
    };
  } else {
    return {
      content: [
        { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
      ],
    };
  }
};

const handleW3DelegationRevoke: ToolHandler = async (args) => {
  const parsed = Schemas.W3DelegationRevokeArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_delegation_revoke: ${parsed.error.message}`
    );
  const { delegationCid, proof } = parsed.data;
  let command = `delegation revoke ${delegationCid}`;
  if (proof) command += ` --proof "${proof}"`;
  const { stdout } = await runW3Command(command);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Successfully revoked delegation ${delegationCid}.`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3ProofAdd: ToolHandler = async (args) => {
  const parsed = Schemas.W3ProofAddArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_proof_add: ${parsed.error.message}`
    );
  const { proofPath } = parsed.data;
  const { stdout } = await runW3Command(`proof add "${proofPath}"`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Successfully added proof from ${proofPath}.`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3ProofLs: ToolHandler = async (args) => {
  const parsed = Schemas.W3ProofLsArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_proof_ls: ${parsed.error.message}`
    );
  const { json } = parsed.data;
  const command = json ? "proof ls --json" : "proof ls";
  const { stdout } = await runW3Command(command);
  if (json) {
    const proofs = parseNdJson(stdout);
    return {
      content: [{ type: "text", text: JSON.stringify({ proofs }) }],
    };
  } else {
    return {
      content: [
        { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
      ],
    };
  }
};

const handleW3KeyCreate: ToolHandler = async (args) => {
  const parsed = Schemas.W3KeyCreateArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_key_create: ${parsed.error.message}`
    );
  const { json } = parsed.data;
  const command = json ? "key create --json" : "key create";
  const { stdout } = await runW3Command(command);
  if (json) {
    try {
      const keyData = JSON.parse(stdout);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              message: "New key pair created (JSON format).",
              keyData,
            }),
          },
        ],
      };
    } catch (e) {
      logger.warn("Failed to parse key create JSON, returning raw.");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              message: "New key pair created (raw output).",
              output: stdout.trim(),
            }),
          },
        ],
      };
    }
  } else {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "New key pair created (raw output).",
            output: stdout.trim(),
          }),
        },
      ],
    };
  }
};

const handleW3BridgeGenerateTokens: ToolHandler = async (args) => {
  const parsed = Schemas.W3BridgeGenerateTokensArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_bridge_generate_tokens: ${parsed.error.message}`
    );
  const { capabilities, expiration, json } = parsed.data;
  let command = "bridge generate-tokens";
  capabilities.forEach((cap) => {
    command += ` --can '${cap}'`;
  });
  if (expiration !== undefined) command += ` --expiration ${expiration}`;
  if (json) command += " --json";
  const { stdout } = await runW3Command(command);
  if (json) {
    try {
      const tokenData = JSON.parse(stdout);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              message: "Bridge tokens generated (JSON format).",
              tokenData,
            }),
          },
        ],
      };
    } catch (e) {
      logger.warn("Failed to parse bridge tokens JSON, returning raw.");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              message: "Bridge tokens generated (raw output).",
              output: stdout.trim(),
            }),
          },
        ],
      };
    }
  } else {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "Bridge tokens generated (raw output).",
            output: stdout.trim(),
          }),
        },
      ],
    };
  }
};

const handleW3CanBlobAdd: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanBlobAddArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_blob_add: ${parsed.error.message}`
    );
  const { path } = parsed.data;
  const { stdout } = await runW3Command(`can blob add "${path}"`);
  const match = stdout.match(/Stored\s+(\S+)\s+\((\S+)\)/);
  const multihash = match?.[1];
  const cid = match?.[2];
  if (!multihash || !cid) {
    logger.warn(
      `w3_can_blob_add: Could not parse multihash/CID from output: ${stdout}`
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "Blob added, but output parsing failed.",
            output: stdout.trim(),
          }),
        },
      ],
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: "Blob added successfully.",
          multihash,
          cid,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3CanBlobLs: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanBlobLsArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_blob_ls: ${parsed.error.message}`
    );
  const { json, size, cursor } = parsed.data;
  let command = "can blob ls";
  if (json) command += " --json";
  if (size) command += ` --size ${size}`;
  if (cursor) command += ` --cursor ${cursor}`;
  const { stdout } = await runW3Command(command);
  if (json) {
    const blobs = parseNdJson(stdout);
    return {
      content: [{ type: "text", text: JSON.stringify({ blobs }) }],
    };
  } else {
    return {
      content: [
        { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
      ],
    };
  }
};

const handleW3CanBlobRm: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanBlobRmArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_blob_rm: ${parsed.error.message}`
    );
  const { multihash } = parsed.data;
  const { stdout } = await runW3Command(`can blob rm ${multihash}`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Blob ${multihash} removed successfully.`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3CanIndexAdd: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanIndexAddArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_index_add: ${parsed.error.message}`
    );
  const { cid } = parsed.data;
  const { stdout } = await runW3Command(`can index add ${cid}`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Index CID ${cid} added successfully.`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3CanUploadAdd: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanUploadAddArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_upload_add: ${parsed.error.message}`
    );
  const { rootCid, shardCids } = parsed.data;
  const shards = shardCids.join(" ");
  const { stdout } = await runW3Command(`can upload add ${rootCid} ${shards}`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Upload with root ${rootCid} registered successfully.`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3CanUploadLs: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanUploadLsArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_upload_ls: ${parsed.error.message}`
    );
  const { json, shards, size, cursor, pre } = parsed.data;
  let command = "can upload ls";
  if (json) command += " --json";
  if (shards) command += " --shards";
  if (size) command += ` --size ${size}`;
  if (cursor) command += ` --cursor ${cursor}`;
  if (pre) command += " --pre";
  const { stdout } = await runW3Command(command);
  if (json) {
    const uploads = parseNdJson(stdout);
    return {
      content: [{ type: "text", text: JSON.stringify({ uploads }) }],
    };
  } else {
    return {
      content: [
        { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
      ],
    };
  }
};

const handleW3CanUploadRm: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanUploadRmArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_upload_rm: ${parsed.error.message}`
    );
  const { rootCid } = parsed.data;
  const { stdout } = await runW3Command(`can upload rm ${rootCid}`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Upload ${rootCid} removed successfully.`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3PlanGet: ToolHandler = async (args) => {
  const parsed = Schemas.W3PlanGetArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_plan_get: ${parsed.error.message}`
    );
  const { accountId } = parsed.data;
  let command = "plan get";
  if (accountId) command += ` --account ${accountId}`;
  const { stdout } = await runW3Command(command);
  try {
    const planData = parseNdJson(stdout);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "Plan information retrieved.",
            planData: planData.length > 0 ? planData[0] : {},
          }),
        },
      ],
    };
  } catch (e) {
    logger.warn(`w3_plan_get: Failed to parse output as NDJSON: ${stdout}`);
    throw new Error(
      `Failed to parse JSON output for w3_plan_get. Raw output: ${stdout}`
    );
  }
};

const handleW3AccountLs: ToolHandler = async (_args) => {
  const parsed = Schemas.W3AccountLsArgsSchema.safeParse(_args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_account_ls: ${parsed.error.message}`
    );
  const { stdout } = await runW3Command("account ls");
  try {
    const accounts = parseNdJson(stdout);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "Authorized accounts retrieved.",
            accounts,
          }),
        },
      ],
    };
  } catch (e) {
    logger.warn(`w3_account_ls: Failed to parse output as NDJSON: ${stdout}`);
    throw new Error(
      `Failed to parse JSON output for w3_account_ls. Raw output: ${stdout}`
    );
  }
};

const handleW3SpaceProvision: ToolHandler = async (args) => {
  const parsed = Schemas.W3SpaceProvisionArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_space_provision: ${parsed.error.message}`
    );
  const { customerId, spaceDid } = parsed.data;
  const { stdout } = await runW3Command(
    `space provision ${customerId} --space ${spaceDid}`
  );
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Space ${spaceDid} provisioned for customer ${customerId}.`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3CouponCreate: ToolHandler = async (args) => {
  const parsed = Schemas.W3CouponCreateArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_coupon_create: ${parsed.error.message}`
    );
  const { claimCode } = parsed.data;
  const { stdout } = await runW3Command(`coupon create ${claimCode}`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: "Attempted to claim coupon.",
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3UsageReport: ToolHandler = async (args) => {
  const parsed = Schemas.W3UsageReportArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_usage_report: ${parsed.error.message}`
    );
  const { spaceDid, json } = parsed.data;
  let command = "usage report";
  if (spaceDid) command += ` --space ${spaceDid}`;
  if (json) command += " --json";
  const { stdout } = await runW3Command(command);
  if (json) {
    try {
      const report = parseNdJson(stdout);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              usageReport: report.length > 0 ? report[0] : {},
            }),
          },
        ],
      };
    } catch (e) {
      logger.warn("Failed to parse usage report JSON, returning raw.");
      return {
        content: [
          { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
        ],
      };
    }
  } else {
    return {
      content: [
        { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
      ],
    };
  }
};

const handleW3CanAccessClaim: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanAccessClaimArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_access_claim: ${parsed.error.message}`
    );
  const { proof } = parsed.data;
  const { stdout } = await runW3Command(`can access claim "${proof}"`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: "Capability claim attempted.",
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3CanStoreAdd: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanStoreAddArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_store_add: ${parsed.error.message}`
    );
  const { path } = parsed.data;
  const { stdout } = await runW3Command(`can store add "${path}"`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: "CAR file stored successfully.",
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3CanStoreLs: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanStoreLsArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_store_ls: ${parsed.error.message}`
    );
  const { json, size, cursor } = parsed.data;
  let command = "can store ls";
  if (json) command += " --json";
  if (size) command += ` --size ${size}`;
  if (cursor) command += ` --cursor ${cursor}`;
  const { stdout } = await runW3Command(command);
  if (json) {
    const stores = parseNdJson(stdout);
    return {
      content: [{ type: "text", text: JSON.stringify({ stores }) }],
    };
  } else {
    return {
      content: [
        { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
      ],
    };
  }
};

const handleW3CanStoreRm: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanStoreRmArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_store_rm: ${parsed.error.message}`
    );
  const { carCid } = parsed.data;
  const { stdout } = await runW3Command(`can store rm ${carCid}`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message: `Successfully removed CAR shard ${carCid}.`,
          output: stdout.trim(),
        }),
      },
    ],
  };
};

const handleW3CanFilecoinInfo: ToolHandler = async (args) => {
  const parsed = Schemas.W3CanFilecoinInfoArgsSchema.safeParse(args);
  if (!parsed.success)
    throw new Error(
      `Invalid arguments for w3_can_filecoin_info: ${parsed.error.message}`
    );
  const { pieceCid } = parsed.data;
  const { stdout } = await runW3Command(`can filecoin info ${pieceCid}`);
  try {
    const info = JSON.parse(stdout);
    return {
      content: [{ type: "text", text: JSON.stringify({ filecoinInfo: info }) }],
    };
  } catch (e) {
    return {
      content: [
        { type: "text", text: JSON.stringify({ output: stdout.trim() }) },
      ],
    };
  }
};

const handleW3Reset: ToolHandler = async (_args) => {
  const parsed = Schemas.W3ResetArgsSchema.safeParse(_args);
  if (!parsed.success)
    throw new Error(`Invalid arguments for w3_reset: ${parsed.error.message}`);
  // const { confirmReset: _confirmReset } = parsed.data; // Value checked by schema
  const { stdout } = await runW3Command(`reset`);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          message:
            "Agent state reset successfully (proofs/delegations removed).",
          output: stdout.trim(),
        }),
      },
    ],
  };
};

// Tool Handlers Map
export const toolHandlers: Record<string, ToolHandler> = {
  w3_login: handleW3Login,
  w3_space_ls: handleW3SpaceLs,
  w3_space_use: handleW3SpaceUse,
  w3_space_create: handleW3SpaceCreate,
  w3_up: handleW3Up,
  w3_ls: handleW3Ls,
  w3_rm: handleW3Rm,
  w3_open: handleW3Open,
  w3_space_info: handleW3SpaceInfo,
  w3_space_add: handleW3SpaceAdd,
  w3_delegation_create: handleW3DelegationCreate,
  w3_delegation_ls: handleW3DelegationLs,
  w3_delegation_revoke: handleW3DelegationRevoke,
  w3_proof_add: handleW3ProofAdd,
  w3_proof_ls: handleW3ProofLs,
  w3_key_create: handleW3KeyCreate,
  w3_bridge_generate_tokens: handleW3BridgeGenerateTokens,
  w3_can_blob_add: handleW3CanBlobAdd,
  w3_can_blob_ls: handleW3CanBlobLs,
  w3_can_blob_rm: handleW3CanBlobRm,
  w3_can_index_add: handleW3CanIndexAdd,
  w3_can_upload_add: handleW3CanUploadAdd,
  w3_can_upload_ls: handleW3CanUploadLs,
  w3_can_upload_rm: handleW3CanUploadRm,
  w3_plan_get: handleW3PlanGet,
  w3_account_ls: handleW3AccountLs,
  w3_space_provision: handleW3SpaceProvision,
  w3_coupon_create: handleW3CouponCreate,
  w3_usage_report: handleW3UsageReport,
  w3_can_access_claim: handleW3CanAccessClaim,
  w3_can_store_add: handleW3CanStoreAdd,
  w3_can_store_ls: handleW3CanStoreLs,
  w3_can_store_rm: handleW3CanStoreRm,
  w3_can_filecoin_info: handleW3CanFilecoinInfo,
  w3_reset: handleW3Reset,
};
