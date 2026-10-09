# State

> Purpose: current status of the project at a glance. Detail and evidence live in CHECKPOINTS.md (verified results), PLAN_LOG.md (plan vs done) and DECISIONS.md (why).
>
> Last updated: 2026-10-09

## Project

Node.js + TypeScript MCP file server (official TypeScript MCP SDK, Streamable HTTP, stateless, bound to 127.0.0.1) exposing sandboxed file tools over a single workspace root.

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| M1 Skeleton | COMPLETE, PASSED | Server boots on http://127.0.0.1:3000/mcp; list_files verified in MCP Inspector; `../..` rejected. |
| M2 Sandbox and core file tools | COMPLETE | list_files, read_file, write_file, str_replace, delete_file. Windows run: 73 tests, 64 passed, 0 failed, 9 skipped. The 9 skipped tests are symlink tests that could not run because the Windows environment did not permit symbolic-link creation. |
| M3 Deployment | IN PROGRESS (not complete) | See below. |

## M3 Deployment: current evidence

Reported by the project owner (command output, not independently re-run by Claude):

- PM2 7.0.4 reports `mcp-file-server` as online.
- Local `/health` returns `{"status":"ok","name":"mcp-file-server"}`.
- Public ngrok `/health` returns HTTP 200.
- Unauthenticated `POST /mcp` returns HTTP 401.

Observed by Claude (2026-10-09, through the connected MCP connection): `list_files` and `read_file` succeeded.

## Caveats

- The successful Claude calls do not independently prove which process served them. They are consistent with the PM2-managed server but do not demonstrate it.
- Symlink protection remains incompletely verified: the implementation exists (resolveSafe), but the 9 symlink-dependent automated tests have never executed. They skipped on Windows (see D-010).
- Claude's calls were made without a bearer token, so they do not establish how authenticated access behaves. The 401 on unauthenticated POST /mcp is the owner-reported evidence that auth is enforced on that route.

## Remaining work

1. Verify PM2 persistence and restart behavior (survives restart, reboot/resurrect as intended).
2. Test authenticated external MCP access (valid bearer token succeeds; missing or wrong token is rejected) from a real external MCP client.
3. Implement and test `search_code`, `git_status` and `git_commit`, if not already present. As of 2026-10-09 only the five core file tools were observed through the connection.
4. Run the 9 symlink tests on an environment that permits symlinks and record the result.
5. Complete documentation and demo preparation.
6. Record M3 in CHECKPOINTS.md as COMPLETE only after items 1 and 2 are verified.
