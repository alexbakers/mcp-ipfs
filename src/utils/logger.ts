// Simple logger writing to stderr to avoid interfering with stdout (MCP)
export const logger = {
  debug: (...args: any[]) => console.error("[DEBUG]", ...args),
  info: (...args: any[]) => console.error("[INFO]", ...args),
  warn: (...args: any[]) => console.error("[WARN]", ...args),
  error: (...args: any[]) => console.error("[ERROR]", ...args),
};
