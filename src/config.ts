import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { validateSecret } from "./auth.js";

const root = path.resolve(process.env.WORKSPACE_ROOT ?? "./workspace");
fs.mkdirSync(root, { recursive: true });

export const config = {
  port: Number(process.env.PORT ?? 3000),

  host: process.env.HOST ?? "127.0.0.1",

  workspaceRoot: fs.realpathSync(root),

  authToken: validateSecret(
    "MCP_AUTH_TOKEN",
    process.env.MCP_AUTH_TOKEN ?? process.env.MCP_BEARER_TOKEN,
  ),

  pathSecret: validateSecret(
    "MCP_PATH_SECRET",
    process.env.MCP_PATH_SECRET,
  ),
} as const;