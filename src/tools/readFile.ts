import fs from "node:fs/promises";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "../config.js";
import { resolveSafe, toDisplayPath } from "../sandbox.js";
import { defineTool, ToolError } from "./helpers.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function registerReadFile(server: McpServer): void {
  defineTool(
    server,
    {
      name: "read_file",
      title: "Read file",
      description:
        "Read a UTF-8 text file from the workspace, optionally a line range. Always read before you edit. " +
        "Output is capped at max_chars; for big files read in chunks with start_line/end_line, or use search_code to find the right lines first. " +
        "The header reports the line range returned and the total line count. " +
        "Fails if the file is missing, is a directory, is binary, or exceeds 5 MB.",
      readOnly: true,
      shape: {
        path: z.string().min(1).max(1024).describe("File path relative to the workspace root."),
        start_line: z.number().int().min(1).optional().describe("First line to return (1-based). Default 1."),
        end_line: z.number().int().min(1).optional().describe("Last line to return (inclusive). Default: until max_chars."),
        max_chars: z.number().int().min(100).max(50000).default(20000).describe("Output cap in characters. Default 20000."),
      },
    },
    async ({ path: userPath, start_line, end_line, max_chars }) => {
      const abs = await resolveSafe(config.workspaceRoot, userPath);

      let stat;
      try {
        stat = await fs.stat(abs);
      } catch {
        throw new ToolError(`File not found: "${userPath}". Use list_files to see what exists.`);
      }
      if (stat.isDirectory()) throw new ToolError(`"${userPath}" is a directory. Use list_files.`);
      if (!stat.isFile()) throw new ToolError(`"${userPath}" is not a regular file.`);
      if (stat.size > MAX_FILE_BYTES) {
        throw new ToolError(`"${userPath}" is ${stat.size} bytes (limit 5 MB). Use search_code to locate what you need.`);
      }

      const buf = await fs.readFile(abs);
      if (buf.includes(0)) throw new ToolError(`"${userPath}" looks like a binary file and cannot be read as text.`);

      const text = buf.toString("utf-8");
      const lines = text.split("\n");
      if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop(); // trailing newline is not a line
      const total = lines.length;
      const from = start_line ?? 1;
      const to = Math.min(end_line ?? total, total);
      if (from > total) throw new ToolError(`start_line ${from} is past the end of the file (${total} lines).`);
      if (to < from) throw new ToolError(`end_line ${to} is before start_line ${from}.`);

      let out = "";
      let last = from - 1;
      for (let i = from; i <= to; i++) {
        const next = lines[i - 1] + "\n";
        if (out.length + next.length > max_chars) break;
        out += next;
        last = i;
      }
      if (last < from) {
        throw new ToolError(`Line ${from} alone exceeds max_chars (${max_chars}). Raise max_chars or read another range.`);
      }

      const more = last < to ? `\n... capped at ${max_chars} chars. Continue with start_line=${last + 1}.` : "";
      return `${toDisplayPath(config.workspaceRoot, abs)}  lines ${from}-${last} of ${total}\n${out}${more}`;
    },
  );
}
