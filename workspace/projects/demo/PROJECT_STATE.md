# PROJECT_STATE

> Purpose: the single "where are we now" file. A new agent session reads this FIRST.
>
> Update rule: OVERWRITE with the current state at the end of every session (history lives in PLAN_LOG, CHECKPOINTS, DECISIONS).

Last updated: 2026-10-06

## Current milestone

M2 - Sandbox: **COMPLETE**

Next: M3 - Deploy (pm2 + ngrok static domain + bearer-token auth + real external client)

## What exists

Server: Node.js + TypeScript MCP SDK, stateless Streamable HTTP, `POST /mcp`, `GET /health`, bound to 127.0.0.1:3000.

Tools implemented (5 of 8):

- list_files
- read_file
- write_file
- str_replace
- delete_file

Tools planned (M4):

- search_code
- git_status
- git_commit

Safety and quality in place:

- strict Zod schemas on every tool (unknown keys rejected)
- `isError` results with actionable messages
- lexical path protection (`../`, absolute, UNC, NUL bytes, sibling-prefix)
- filesystem-aware protection via `resolveSafe()` (symlinks, canonical root)
- `.git` and `node_modules` cannot be modified by any tool
- output limits and chunking (`list_files` max_entries, `read_file` ranges + max_chars)
- one JSON log line per handled tool call (stderr)
- destructive tools annotated
- `write_file` will not overwrite by default
- `str_replace` requires exactly one match

## Automated tests (`npm test`)

Windows run:

- 73 total
- 64 passed
- 0 failed
- 9 skipped

The 9 skipped tests are symlink-dependent tests. The Windows environment did not permit symbolic-link creation.

Linux verification:

- 73 total
- 73 passed
- 0 skipped

## Manual M2 verification

Successfully verified:

- `write_file`
- `read_file`
- `str_replace`
- `delete_file`
- `../` path escape rejection
- absolute Windows path rejection
- `.git` modification protection
- `node_modules` modification protection
- missing-file error handling

## Open items / known limits

- The 9 symlink-dependent tests skip on this Windows machine because the environment does not permit symlink creation.
- No authentication yet. Do NOT expose the server publicly before M3 bearer-token authentication is implemented.
- Handoff files exist, but protocol tooling is not implemented yet.
- Schema-validation failures are rejected by the SDK before the tool handler, so they are not currently logged by the tool helper.
- `delete_file` is permanent until Git-based recovery is implemented in M4.

## Needed from the owner for M3

- ngrok account and claimed static domain
- pm2 installed

Never share the ngrok authtoken in project files, logs, screenshots, or chat.