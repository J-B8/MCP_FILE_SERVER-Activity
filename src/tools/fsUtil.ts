import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { ToolError } from "./helpers.js";

export const MAX_WRITE_CHARS = 1_000_000;

/** Write via temp file + rename so a crash never leaves a half-written file. */
export async function atomicWrite(abs: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  try {
    await fs.writeFile(tmp, content, "utf-8");
    await fs.rename(tmp, abs);
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
}

/** Read an existing regular text file for editing, with friendly errors. */
export async function readTextForEdit(abs: string, userPath: string): Promise<string> {
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    throw new ToolError(`File not found: "${userPath}". Use list_files to see what exists.`);
  }
  if (!stat.isFile()) throw new ToolError(`"${userPath}" is not a regular file.`);
  if (stat.size > MAX_WRITE_CHARS * 4) throw new ToolError(`"${userPath}" is too large to edit (${stat.size} bytes).`);
  const buf = await fs.readFile(abs);
  if (buf.includes(0)) throw new ToolError(`"${userPath}" looks like a binary file and cannot be edited as text.`);
  return buf.toString("utf-8");
}
