import "dotenv/config";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(process.env.WORKSPACE_ROOT ?? "./workspace");
fs.mkdirSync(root, { recursive: true });

export const config = {
  port: Number(process.env.PORT ?? 3000),
  // Bind to loopback only. ngrok (M3) forwards to this; nothing else can reach it.
  host: process.env.HOST ?? "127.0.0.1",
  // realpath so the sandbox root itself is canonical (matters once symlinks are checked in M2).
  workspaceRoot: fs.realpathSync(root),
} as const;
