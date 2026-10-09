import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../config.js";
import { ToolError, defineTool } from "./helpers.js";

const execFileAsync = promisify(execFile);

/**
 * Register a read-only tool that reports Git changes.
 * Git arguments are fixed; callers cannot supply shell commands.
 */
export function registerGitStatus(server: McpServer): void {
  defineTool(
    server,
    {
      name: "git_status",
      title: "Git Status",
      description:
        "Show the current Git repository status using workspace-relative paths. This tool is read-only.",
      shape: {},
      readOnly: true,
    },
    async () => {
      let output: string;

      try {
        // Fixed Git command; no shell is used.
        const result = await execFileAsync(
          "git",
          ["status", "--short", "--branch", "--untracked-files=all"],
          {
            cwd: config.gitRoot,
            timeout: 10_000,
            windowsHide: true,
            maxBuffer: 1024 * 1024,
          },
        );

        output = result.stdout.trim();
      } catch (err) {
        const error = err as NodeJS.ErrnoException & {
          stderr?: string;
          code?: string | number;
        };

        if (error.code === "ENOENT") {
          throw new ToolError("Git is not installed or could not be found.");
        }

        if (error.code === "ETIMEDOUT") {
          throw new ToolError("Git status timed out.");
        }

        const detail = error.stderr?.trim() ?? "";

        if (/not a git repository/i.test(detail)) {
          throw new ToolError(
            "GIT_ROOT does not point to a valid Git repository.",
          );
        }

        throw new ToolError("Git status could not be completed.");
      }

      if (!output) {
        return "Git working tree is clean.";
      }

      // Replace absolute repository paths if Git happens to include them.
      const normalizedRoot = path.resolve(config.gitRoot);
      output = output.split(normalizedRoot).join(".");

      return `Git status:\n${output}`;
    },
  );
}