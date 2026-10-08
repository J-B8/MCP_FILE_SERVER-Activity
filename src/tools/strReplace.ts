import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "../config.js";
import { assertMutable, resolveSafe } from "../sandbox.js";
import { atomicWrite, MAX_WRITE_CHARS, readTextForEdit } from "./fsUtil.js";
import { defineTool, ToolError } from "./helpers.js";

export function registerStrReplace(server: McpServer): void {
  defineTool(
    server,
    {
      name: "str_replace",
      title: "Replace text in file",
      description:
        "Replace ONE exact occurrence of old_str with new_str in an existing file. old_str must appear exactly once: " +
        "if it is missing or appears several times the call fails and the file is not changed, so widen old_str with " +
        "surrounding lines to make it unique. Read the file first so old_str matches exactly (whitespace included). " +
        "Use this instead of write_file for small edits.",
      readOnly: false,
      destructive: true,
      shape: {
        path: z.string().min(1).max(1024).describe("File path relative to the workspace root."),
        old_str: z.string().min(1).max(MAX_WRITE_CHARS).describe("Exact text to find. Must occur exactly once."),
        new_str: z.string().max(MAX_WRITE_CHARS).describe("Replacement text. May be empty to delete old_str."),
      },
    },
    async ({ path: userPath, old_str, new_str }) => {
      if (old_str === new_str) throw new ToolError("old_str and new_str are identical; nothing to change.");
      const abs = await resolveSafe(config.workspaceRoot, userPath);
      assertMutable(config.workspaceRoot, abs);
      const text = await readTextForEdit(abs, userPath);

      const first = text.indexOf(old_str);
      if (first === -1) {
        throw new ToolError(
          `old_str was not found in "${userPath}". The file was not changed. Re-read the relevant lines with read_file and copy the text exactly, including whitespace.`,
        );
      }
      if (text.indexOf(old_str, first + old_str.length) !== -1) {
        const count = text.split(old_str).length - 1;
        throw new ToolError(
          `old_str matches ${count} places in "${userPath}". The file was not changed. Add surrounding lines to old_str so it matches exactly once.`,
        );
      }
      // slice/concat instead of String.replace so "$&" etc. in new_str stay literal
      const updated = text.slice(0, first) + new_str + text.slice(first + old_str.length);
      await atomicWrite(abs, updated);
      const line = text.slice(0, first).split("\n").length;
      return `Replaced 1 occurrence in ${userPath} at line ${line}.`;
    },
  );
}
