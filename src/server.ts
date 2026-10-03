import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerListFiles } from "./tools/listFiles.js";

/** Build a fresh MCP server instance with all tools registered. */
export function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-file-server", version: "0.1.0" });
  registerListFiles(server);
  return server;
}
