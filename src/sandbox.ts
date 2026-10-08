import fs from "node:fs/promises";
import path from "node:path";

export class SandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxError";
  }
}

/** Folders no tool may modify (git internals, dependencies). */
const PROTECTED_SEGMENTS = new Set([".git", "node_modules"]);

function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === "" || (rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel));
}

/**
 * Layer 1 (lexical, synchronous): rejects NUL bytes, absolute paths and "../" escapes.
 * Tool paths are always RELATIVE to the root ("." = the root itself).
 */
export function resolveInSandbox(root: string, userPath: string): string {
  if (userPath.includes("\0")) {
    throw new SandboxError("Path contains a NUL byte and was rejected.");
  }
  if (path.isAbsolute(userPath) || /^[a-zA-Z]:/.test(userPath) || userPath.startsWith("\\\\")) {
    throw new SandboxError(
      `Absolute paths are not allowed: "${userPath}". Use a path relative to the workspace root (e.g. "projects/demo").`,
    );
  }
  const resolved = path.resolve(root, userPath);
  if (!isInside(root, resolved)) {
    throw new SandboxError(`Path escapes the workspace root and was rejected: "${userPath}".`);
  }
  return resolved;
}

/**
 * Layer 2 (filesystem, async): everything in layer 1, PLUS symlink protection.
 * Finds the deepest part of the path that exists, resolves it with realpath
 * (following symlinks), and requires the result to still be inside the root.
 * Works for paths that do not exist yet (writes). The returned path is the
 * resolved one, so callers operate on what was actually checked.
 *
 */
export async function resolveSafe(root: string, userPath: string): Promise<string> {
  const lexical = resolveInSandbox(root, userPath);
  // Canonical form of the root, computed the SAME way as `real` below, so both
  // sides always agree on spelling (Windows 8.3 names, symlinked roots, case).
  const realRoot = await fs.realpath(root);

  let probe = lexical;
  for (;;) {
    try {
      await fs.lstat(probe);
      break;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw err;
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }

  let real: string;
  try {
    real = await fs.realpath(probe);
  } catch {
    // lstat succeeded but realpath failed: a dangling symlink. Its target is unknowable, so refuse.
    throw new SandboxError(`"${userPath}" goes through a broken symlink and was rejected.`);
  }
  if (!isInside(realRoot, real)) {
    throw new SandboxError(`Path escapes the workspace root via a symlink and was rejected: "${userPath}".`);
  }
  // Return the path spelled relative to the root AS CONFIGURED, so toDisplayPath() and
  // callers stay consistent, while still pointing at what was actually checked.
  return path.join(root, path.relative(realRoot, real), path.relative(probe, lexical));
}

/** For tools that modify files: refuse protected folders such as .git. */
export function assertMutable(root: string, abs: string): void {
  const rel = path.relative(root, abs);
  if (rel.split(path.sep).some((seg) => PROTECTED_SEGMENTS.has(seg))) {
    throw new SandboxError(`Modifying files inside .git or node_modules is not allowed: "${rel.split(path.sep).join("/")}".`);
  }
}

/** Path as shown back to agents: always relative, always forward slashes. */
export function toDisplayPath(root: string, abs: string): string {
  const rel = path.relative(root, abs).split(path.sep).join("/");
  return rel === "" ? "." : rel;
}
