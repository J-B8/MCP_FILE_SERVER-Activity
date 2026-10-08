import fs from "node:fs/promises";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "../config.js";
import { assertMutable, resolveSafe } from "../sandbox.js";
import { defineTool, ToolError } from "./helpers.js";

export function registerDeleteFile(server: McpServer): void {
  defineTool(
    server,
    {
      name: "delete_file",
      title: "Delete file",
      description:
        "Permanently delete ONE file. Directories are never deleted (delete their files individually). " +
        "This cannot be undone from the tools, so list_files/read_file first to confirm it is the right file. " +
        "Fails if the path is missing, is a directory, or is inside .git/node_modules.",
      readOnly: false,
      destructive: true,
      shape: {
        path: z.string().min(1).max(1024).describe("File path relative to the workspace root."),
      },
    },
    async ({ path: userPath }) => {
      const abs = await resolveSafe(config.workspaceRoot, userPath);
      assertMutable(config.workspaceRoot, abs);
      if (abs === config.workspaceRoot) throw new ToolError("The workspace root cannot be deleted.");
      let stat;
      try {
        stat = await fs.stat(abs);
      } catch {
        throw new ToolError(`File not found: "${userPath}". Use list_files to see what exists.`);
      }
      if (stat.isDirectory()) {
        throw new ToolError(`"${userPath}" is a directory. delete_file only removes single files; list_files it and delete each file.`);
      }
      await fs.unlink(abs);
      return `Deleted ${userPath}.`;
    },
  );
}
