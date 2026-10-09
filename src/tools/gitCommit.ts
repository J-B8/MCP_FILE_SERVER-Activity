import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { config } from "../config.js";
import { resolveSafe } from "../sandbox.js";
import { ToolError, defineTool } from "./helpers.js";

const execFileAsync = promisify(execFile);

export function registerGitCommit(server: McpServer): void {
  defineTool(
    server,
    {
      name: "git_commit",
      title: "Git Commit",
      description:
        "Commit explicitly selected files inside the workspace. Refuses to run when changes are already staged.",
      shape: {
        message: z.string().trim().min(1).max(200),
        paths: z.array(z.string().min(1).max(500)).min(1).max(50),
      },
      readOnly: false,
    },
    async ({ message, paths }) => {
      const relativePaths: string[] = [];

      for (const filePath of paths) {
        const safePath = await resolveSafe(config.workspaceRoot, filePath);
        const relativePath = path.relative(config.gitRoot, safePath);

        if (
          relativePath === "" ||
          relativePath === ".." ||
          relativePath.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relativePath)
        ) {
          throw new ToolError(
            "Each commit path must be inside the workspace and Git repository.",
          );
        }

        // Only allow existing regular files, not directories or symlinks.
        const stat = await fs.lstat(safePath);
        if (!stat.isFile()) {
          throw new ToolError(
            "Each commit path must point to an existing regular file.",
          );
        }

        relativePaths.push(relativePath);
      }

      const uniquePaths = [...new Set(relativePaths)];

      try {
        // Refuse to commit changes that were staged beforehand.
        try {
          await execFileAsync(
            "git",
            ["diff", "--cached", "--quiet"],
            {
              cwd: config.gitRoot,
              timeout: 10_000,
              windowsHide: true,
            },
          );
        } catch (err) {
          const error = err as NodeJS.ErrnoException & {
            code?: string | number;
          };

          if (Number(error.code) === 1) {
            throw new ToolError(
              "Existing staged changes detected. Commit them separately or unstage them first.",
            );
          }

          throw err;
        }

        await execFileAsync(
          "git",
          ["add", "--", ...uniquePaths],
          {
            cwd: config.gitRoot,
            timeout: 10_000,
            windowsHide: true,
            maxBuffer: 1024 * 1024,
          },
        );

        const result = await execFileAsync(
          "git",
          ["commit", "-m", message],
          {
            cwd: config.gitRoot,
            timeout: 10_000,
            windowsHide: true,
            maxBuffer: 1024 * 1024,
          },
        );

        return `Git commit created:\n${result.stdout.trim()}`;
        } catch (err) {
            if (err instanceof ToolError) {
                throw err;
            }

            const error = err as NodeJS.ErrnoException & {
                stderr?: string;
                code?: string | number;
            };

        if (error.code === "ENOENT") {
          throw new ToolError("Git is not installed or could not be found.");
        }

        if (error.code === "ETIMEDOUT") {
          throw new ToolError("Git commit timed out.");
        }

        const detail = error.stderr?.trim() ?? "";

        if (/nothing to commit/i.test(detail)) {
          throw new ToolError("There are no changes to commit.");
        }

        if (/not a git repository/i.test(detail)) {
          throw new ToolError(
            "GIT_ROOT does not point to a valid Git repository.",
          );
        }

        throw new ToolError("Git commit could not be completed.");
      }
    },
  );
}