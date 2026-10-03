import path from "node:path";

export class SandboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxError";
  }
}

/**
 * Resolve a tool-supplied path against the workspace root.
 * Tool paths are always RELATIVE to the root ("." = the root itself).
 *
 * M1 scope: lexical containment (absolute paths, "../" escapes, NUL bytes).
 * M2 adds symlink (realpath) checks and the full escape test suite.
 */
export function resolveInSandbox(root: string, userPath: string): string {
  if (userPath.includes("\0")) {
    throw new SandboxError("Path contains a NUL byte and was rejected.");
  }
  if (path.isAbsolute(userPath) || /^[a-zA-Z]:[\\/]/.test(userPath)) {
    throw new SandboxError(
      `Absolute paths are not allowed: "${userPath}". Use a path relative to the workspace root (e.g. "projects/demo").`,
    );
  }
  const resolved = path.resolve(root, userPath);
  const rel = path.relative(root, resolved);
  if (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)) {
    throw new SandboxError(
      `Path escapes the workspace root and was rejected: "${userPath}".`,
    );
  }
  return resolved;
}

/** Path as shown back to agents: always relative, always forward slashes. */
export function toDisplayPath(root: string, abs: string): string {
  const rel = path.relative(root, abs).split(path.sep).join("/");
  return rel === "" ? "." : rel;
}
