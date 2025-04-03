import { exec } from "child_process";
import util from "util";
import { logger } from "./utils/logger.js";

const execPromise = util.promisify(exec);

/**
 * Executes a w3 cli command with common options.
 * @param subCommand The w3 subcommand and arguments (e.g., "space ls --json")
 * @returns An object containing the untrimmed stdout and stderr.
 */
export async function runW3Command(
  command: string
): Promise<{ stdout: string; stderr: string }> {
  const fullCommand = `w3 ${command}`;
  logger.debug(`Executing: ${fullCommand}`);
  try {
    const { stdout, stderr } = await execPromise(fullCommand);
    if (stderr) {
      // w3cli often uses stderr for informational messages, log as warning
      logger.warn(`w3 command stderr: ${stderr}`);
    }
    logger.debug(`w3 command stdout: ${stdout.substring(0, 100)}...`);
    return { stdout, stderr };
  } catch (error: any) {
    logger.error(`Error executing w3 command '${command}':`, error);
    const errorMessage = error.stderr
      ? `${error.message}\nStderr: ${error.stderr}`
      : error.message;
    throw new Error(`Failed to execute 'w3 ${command}': ${errorMessage}`);
  }
}

/**
 * Parses newline-delimited JSON (NDJSON) string into an array of objects.
 * Handles potential errors during parsing of individual lines.
 */
export function parseNdJson<T>(ndjson: string): T[] {
  const lines = ndjson
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");
  try {
    return lines.map((line: string, index: number) => {
      try {
        return JSON.parse(line);
      } catch (e: any) {
        if (
          e instanceof SyntaxError &&
          (e as any).message.includes("Unexpected token")
        ) {
          (e as any).inputLine = line; // Attach problematic line for context
        }
        logger.error(
          `Failed to parse NDJSON line #${index + 1}. Error: ${
            e.message
          }. Line content: "${line.substring(0, 100)}${
            line.length > 100 ? "..." : ""
          }"`
        );
        throw e; // Re-throw after logging
      }
    });
  } catch (e: any) {
    // This outer catch handles cases where split/map might fail, though unlikely
    logger.error(
      `Failed to parse NDJSON output. Error: ${
        e.message
      }. Full NDJSON (start): ${ndjson.substring(0, 200)}...`
    );
    throw new Error(
      `Failed to parse NDJSON output. Error: ${e.message}. Please check w3cli output format.`
    );
  }
}
