import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerListFiles } from "./tools/listFiles.js";
import { registerReadFile } from "./tools/readFile.js";
import { registerWriteFile } from "./tools/writeFile.js";
import { registerStrReplace } from "./tools/strReplace.js";
import { registerDeleteFile } from "./tools/deleteFile.js";

/** Build a fresh MCP server instance with all tools registered. */

export function createServer(): McpServer {
  const server = new McpServer({
    name: "mcp-file-server",
    version: "0.1.0",
  });

  registerListFiles(server);
  registerReadFile(server);
  registerWriteFile(server);
  registerStrReplace(server);
  registerDeleteFile(server);

  return server;
}