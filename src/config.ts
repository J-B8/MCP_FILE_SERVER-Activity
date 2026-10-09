import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { validateSecret } from "./auth.js";

const root = path.resolve(process.env.WORKSPACE_ROOT ?? "./workspace");
fs.mkdirSync(root, { recursive: true });

const gitRoot = path.resolve(process.env.GIT_ROOT ?? root);

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "127.0.0.1",

  // File tools remain confined to this directory.
  workspaceRoot: fs.realpathSync(root),

  // Git tools use this separately configured repository path.
  gitRoot: fs.realpathSync(gitRoot),

  authToken: validateSecret(
    "MCP_AUTH_TOKEN",
    process.env.MCP_AUTH_TOKEN ?? process.env.MCP_BEARER_TOKEN,
  ),
  pathSecret: validateSecret(
    "MCP_PATH_SECRET",
    process.env.MCP_PATH_SECRET,
  ),
} as const;