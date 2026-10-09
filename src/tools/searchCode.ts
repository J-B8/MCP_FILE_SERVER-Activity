import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "../config.js";
import { resolveSafe, toDisplayPath } from "../sandbox.js";
import { defineTool, ToolError } from "./helpers.js";


const SKIP_DIRS = new Set([".git", "node_modules"]);
const MAX_FILE_BYTES = 1_000_000;
const MAX_RESULTS = 200;

export function registerSearchCode(server: McpServer): void {
  defineTool(
    server,
    {
      name: "search_code",
      title: "Search code",
      description:
        "Search text inside files in the workspace. " +
        "Skips .git, node_modules, binary files, and oversized files. " +
        "Results are capped; narrow the path or query if truncated. " +
        "Paths must remain inside the workspace root.",
      readOnly: true,
      shape: {
        query: z.string().min(1).max(500)
          .describe("Text to find. Matching is case-insensitive."),
        path: z.string().max(1024).default(".")
          .describe("Workspace-relative directory or file to search. Default '.'."),
        max_results: z.number().int().min(1).max(MAX_RESULTS).default(50)
          .describe("Maximum matching lines to return (1-200). Default 50."),
      },
    },
    async ({ query, path: userPath, max_results }) => {
      const root = config.workspaceRoot;
      const start = await resolveSafe(root, userPath);

      let startStat;
      try {
        startStat = await fs.stat(start);
      } catch {
        throw new ToolError(
          `Path not found: "${userPath}". Use list_files to see what exists.`,
        );
      }

      if (!startStat.isDirectory() && !startStat.isFile()) {
        throw new ToolError(`"${userPath}" is not a regular file or directory.`);
      }

      const matches: string[] = [];
      let filesScanned = 0;
      let truncated = false;
      const needle = query.toLocaleLowerCase();

      async function searchFile(file: string): Promise<void> {
        if (truncated) return;

        let stat;
        try {
          stat = await fs.stat(file);
        } catch {
          return; // Ignore files that disappear during the search.
        }

        if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return;

        // Re-check each file's canonical path to block symlink escapes.
        let safeFile: string;
        try {
          safeFile = await resolveSafe(root, path.relative(root, file));
        } catch {
          return;
        }

        let content: string;
        try {
          const buffer = await fs.readFile(safeFile);
          if (buffer.includes(0)) return; // Likely binary.
          content = buffer.toString("utf8");
        } catch {
          return;
        }

        filesScanned++;
        const lines = content.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
          if (lines[i]!.toLocaleLowerCase().includes(needle)) {
            if (matches.length >= max_results) {
              truncated = true;
              return;
            }

            const excerpt = lines[i]!.trim().slice(0, 300);
            matches.push(
              `${toDisplayPath(root, safeFile)}:${i + 1}: ${excerpt}`,
            );
          }
        }
      }

      async function walk(dir: string): Promise<void> {
        if (truncated) return;

        let entries;
        try {
          entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
          return;
        }

        entries.sort((a, b) => a.name.localeCompare(b.name));

        for (const entry of entries) {
          if (truncated) return;
          if (SKIP_DIRS.has(entry.name)) continue;

          const candidate = path.join(dir, entry.name);

          // Do not follow symlinks.
          if (entry.isSymbolicLink()) continue;

          if (entry.isDirectory()) {
            await walk(candidate);
          } else if (entry.isFile()) {
            await searchFile(candidate);
          }
        }
      }

      if (startStat.isFile()) {
        await searchFile(start);
      } else {
        await walk(start);
      }

      if (matches.length === 0) {
        return `No matches for "${query}". Files scanned: ${filesScanned}.`;
      }

      const footer = truncated
        ? `\nResults capped at ${max_results}. Narrow the path or use a more specific query.`
        : "";

      return (
        `Search: "${query}"\n` +
        `Files scanned: ${filesScanned}\n` +
        `Matches: ${matches.length}${truncated ? "+" : ""}\n` +
        matches.join("\n") +
        footer
      );
    },
  );
}