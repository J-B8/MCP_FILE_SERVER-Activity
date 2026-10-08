import fs from "node:fs/promises";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "../config.js";
import { assertMutable, resolveSafe } from "../sandbox.js";
import { atomicWrite, MAX_WRITE_CHARS } from "./fsUtil.js";
import { defineTool, ToolError } from "./helpers.js";

export function registerWriteFile(server: McpServer): void {
  defineTool(
    server,
    {
      name: "write_file",
      title: "Write file",
      description:
        "Create a new text file, or fully replace an existing one. Parent folders are created automatically. " +
        "By default it FAILS if the file already exists, so you never overwrite by accident: read_file it first, " +
        "then pass overwrite=true only if replacing everything is really intended. " +
        "For small edits to an existing file use str_replace instead (cheaper and safer). Content is limited to 1,000,000 characters.",
      readOnly: false,
      destructive: true,
      shape: {
        path: z.string().min(1).max(1024).describe("File path relative to the workspace root."),
        content: z.string().max(MAX_WRITE_CHARS).describe("Full file content (UTF-8 text)."),
        overwrite: z.boolean().default(false).describe("Allow replacing an existing file. Default false."),
      },
    },
    async ({ path: userPath, content, overwrite }) => {
      const abs = await resolveSafe(config.workspaceRoot, userPath);
      assertMutable(config.workspaceRoot, abs);

      let existed = false;
      try {
        const st = await fs.stat(abs);
        if (st.isDirectory()) throw new ToolError(`"${userPath}" is a directory, not a file.`);
        existed = true;
      } catch (err) {
        if (err instanceof ToolError) throw err;
      }
      if (existed && !overwrite) {
        throw new ToolError(
          `"${userPath}" already exists. Read it with read_file first. To replace it entirely, call write_file again with overwrite=true; for a small change use str_replace.`,
        );
      }
      await atomicWrite(abs, content);
      return `${existed ? "Overwrote" : "Created"} ${userPath} (${Buffer.byteLength(content, "utf-8")} bytes).`;
    },
  );
}
