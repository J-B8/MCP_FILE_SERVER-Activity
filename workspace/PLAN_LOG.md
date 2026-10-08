# PLAN_LOG

> Purpose: chronological record of what was planned and what was actually done.
>
> Update rule: append new entries. Do not rewrite old entries.

## 001 — M1 Skeleton

Date: 2026-10-03

### Plan
- Build the initial Node.js + TypeScript MCP file server.
- Use the official TypeScript MCP SDK.
- Use Streamable HTTP.
- Implement `list_files`.
- Bind the server to localhost.
- Verify the server with MCP Inspector.

### Completed
- Server successfully started at:
  `http://127.0.0.1:3000/mcp`
- `list_files` was successfully tested through MCP Inspector.
- Workspace listing was returned successfully.
- A path escape attempt using `../..` was rejected.

### Result
M1 completed successfully.

---

## 002 — M2 Sandbox

Date: 2026-10-06

### Plan
- Add the remaining core file tools.
- Strengthen path sandboxing.
- Add filesystem-aware symlink protection.
- Reject modifications to `.git` and `node_modules`.
- Add strict schemas and consistent error handling.
- Add automated sandbox and tool tests.
- Verify destructive tools manually.

### Completed
Implemented five core tools:

- `list_files`
- `read_file`
- `write_file`
- `str_replace`
- `delete_file`

Security and quality improvements:

- Strict Zod schemas.
- Unknown input keys rejected.
- `isError: true` for handled tool failures.
- Lexical path escape protection.
- Absolute and UNC path rejection.
- NUL-byte rejection.
- Filesystem-aware `resolveSafe()` protection.
- Symlink escape protection.
- `.git` and `node_modules` mutation protection.
- Output limits and chunked file reading.
- JSON logging for handled tool calls.
- `write_file` does not overwrite by default.
- `str_replace` requires exactly one match.

### Automated test result

Windows:

- 73 total
- 64 passed
- 0 failed
- 9 skipped

### Manual verification

Successfully verified:

- `write_file`
- `read_file`
- `str_replace`
- `delete_file`
- `../` path escape rejection
- absolute path rejection
- `.git` protection
- `node_modules` protection
- missing-file errors

### Result

M2 completed successfully.

### Next planned milestone

M3 — Deployment:

- pm2 process manager
- ngrok static domain
- bearer-token authentication
- real external MCP client verification