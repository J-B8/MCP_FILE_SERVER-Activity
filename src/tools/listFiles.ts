import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "../config.js";
import { resolveInSandbox, toDisplayPath } from "../sandbox.js";
import { defineTool, ToolError } from "./helpers.js";

const HIDDEN = new Set([".git", "node_modules"]);

export function registerListFiles(server: McpServer): void {
  defineTool(
    server,
    {
      name: "list_files",
      title: "List files",
      description:
        "List files and folders inside the workspace. Paths are relative to the workspace root ('.' = root). " +
        "Use this first to orient yourself before reading or writing. Output is capped at max_entries; " +
        "if truncated, narrow `path` or lower `max_depth` instead of raising the cap. " +
        "Fails if the path does not exist, is not a directory, or escapes the workspace.",
      readOnly: true,
      shape: {
        path: z
          .string()
          .max(1024)
          .default(".")
          .describe("Directory to list, relative to the workspace root. Default '.'."),
        recursive: z
          .boolean()
          .default(false)
          .describe("List subfolders too. Default false (one level)."),
        max_depth: z
          .number()
          .int()
          .min(1)
          .max(6)
          .default(2)
          .describe("Only used when recursive=true. Folder levels to descend (1-6). Default 2."),
        max_entries: z
          .number()
          .int()
          .min(1)
          .max(500)
          .default(100)
          .describe("Maximum entries returned (1-500). Default 100."),
      },
    },
    async ({ path: userPath, recursive, max_depth, max_entries }) => {
      const root = config.workspaceRoot;
      const start = resolveInSandbox(root, userPath);

      let stat;
      try {
        stat = await fs.stat(start);
      } catch {
        throw new ToolError(
          `Path not found: "${userPath}". Call list_files with path "." to see what exists.`,
        );
      }
      if (!stat.isDirectory()) {
        throw new ToolError(
          `"${userPath}" is a file, not a directory. Use read_file to read it.`,
        );
      }

      const lines: string[] = [];
      let truncated = false;

      async function walk(dir: string, depth: number): Promise<void> {
        const entries = (await fs.readdir(dir, { withFileTypes: true }))
          .filter((e) => !HIDDEN.has(e.name))
          .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));

        for (const entry of entries) {
          if (lines.length >= max_entries) {
            truncated = true;
            return;
          }
          const abs = path.join(dir, entry.name);
          const shown = toDisplayPath(root, abs);
          if (entry.isDirectory()) {
            lines.push(`d  ${shown}/`);
            if (recursive && depth < max_depth) await walk(abs, depth + 1);
          } else if (entry.isFile()) {
            const { size } = await fs.stat(abs);
            lines.push(`f  ${shown}  (${size} B)`);
          } else {
            lines.push(`o  ${shown}  (not a regular file)`);
          }
          if (truncated) return;
        }
      }

      await walk(start, 1);

      if (lines.length === 0) return `${toDisplayPath(root, start)}: (empty directory)`;
      const header = `${toDisplayPath(root, start)}  [${lines.length} entr${lines.length === 1 ? "y" : "ies"}]`;
      const footer = truncated
        ? `\n... truncated at ${max_entries} entries. Narrow 'path' or lower 'max_depth'.`
        : "";
      return `${header}\n${lines.join("\n")}${footer}`;
    },
  );
}
