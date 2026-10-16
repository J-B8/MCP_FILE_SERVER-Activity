# MCP File Server

A sandboxed file server for AI agents. It exposes eight single-purpose tools over the Model Context Protocol (MCP), so one or more agents can read, search, edit and commit files in a shared workspace and carry context from one session to the next.

**Last reviewed:** 2026-10-16

**Project status: COMPLETE.** The MCP File Server implementation and final documentation handoff are complete. Typecheck and the production build passed, and the latest owner-reported test run reports 80 passed, 0 failed, and 0 skipped. Remaining deployment/authentication and live symlink checks are documented as residual verification caveats; they are not represented as passed.

**Evidence labels:** Verification claims are distinguished as Verified live, Automated tests, Reported, or Not yet verified. Verified live means a tool was called through the connected MCP server or a live endpoint was checked and the result was observed. Automated tests means covered by the test suite; the latest run on 2026-10-16 reported 80 total, 80 passed, 0 failed, and 0 skipped. Reported means stated in handoff files, tool descriptions, or by the project owner, but not independently re-run. Not yet verified means none of the above.

## Technology stack

- Node.js and TypeScript with the official TypeScript MCP SDK
- Streamable HTTP transport, stateless: a new server and transport per request (D-008, Reported)
- Zod input validation; the live tool schemas reject unknown input keys (Verified live)
- PM2 process management and an ngrok static-domain tunnel (Reported)
- Git, used through `git_status` and `git_commit`

The Node.js version and dependency versions are **Not yet verified**, because `package.json` is outside the sandbox the tools can read.

## Tools

All paths are relative to the workspace root. Argument names and limits come from the live tool schemas.

| Tool | Purpose | Arguments (limits) |
|---|---|---|
| `list_files` | List files and folders | `path` (default `.`), `recursive` (default false), `max_depth` (1-6, default 2, only with `recursive`), `max_entries` (1-500, default 100) |
| `read_file` | Read a UTF-8 text file, whole or by line range | `path`, `start_line`, `end_line`, `max_chars` (100-50000, default 20000). Fails on missing files, directories, binary files and files over 5 MB. |
| `write_file` | Create a file, or replace one | `path`, `content` (up to 1,000,000 characters), `overwrite` (default false). Parent folders are created automatically. |
| `str_replace` | Replace exactly one occurrence of text | `path`, `old_str` (must occur exactly once), `new_str` (may be empty) |
| `delete_file` | Permanently delete one file | `path`. Never deletes directories; fails inside `.git` and `node_modules`. |
| `search_code` | Case-insensitive text search | `query` (up to 500 characters), `path` (default `.`), `max_results` (1-200, default 50). Skips `.git`, `node_modules`, binary and oversized files. |
| `git_status` | Show repository status (read-only) | None |
| `git_commit` | Commit explicitly selected files | `message` (1-200 characters), `paths` (1-50 entries). Refuses to run when changes are already staged. |

`git_commit` is implemented. Its rejection of a path outside the workspace was verified live on 2026-10-15. A successful local commit was verified on 2026-10-16 using MCP Inspector. Commit: 5d2860d12947425d0c76c56d0702081bb704fea5; message: test: verify git_commit tool. The commit tracks workspace/git-commit-test.txt and has not yet been pushed to origin/master.

## Verification status

| Area | Item | Status |
|---|---|---|
| Tools | `list_files`, `read_file`, `search_code`, `git_status` | Verified live |
| Tools | `write_file` (create), `str_replace` (single match), `delete_file` | Verified live, 2026-10-15. A disposable file was created, read back, edited, read back, deleted and confirmed gone; workspace listing and Git status were unchanged afterwards. |
| Tools | `git_commit`: outside-workspace path rejection | Verified live, 2026-10-15; no repository state changed |
| Tools | `git_commit`: successful commit | **Verified live locally, 2026-10-16.** |
| Tools | `git_commit`: refusal when changes are already staged | Reported automated coverage; test implementation not independently inspected |
| Tools | `write_file` overwrite refusal; `str_replace` multiple-match refusal | Verified live, 2026-10-15 |
| Security | `../` paths rejected | Verified live (`read_file`, `git_commit`) |
| Security | Absolute paths rejected, including Windows drive paths | Verified live (`read_file`) |
| Security | UNC paths, NUL bytes, `.git` and `node_modules` protection, atomic writes, single-file delete | Reported |
| Security | Symlink escape protection (`resolveSafe()`) | Implemented. Earlier runs skipped 9 symlink-dependent tests; the latest owner-reported run on 2026-10-16 reports 80 passed, 0 failed, 0 skipped. The live symlink-escape behavior has not been independently verified |
| Deployment | PM2 reported `mcp-file-server` online on 2026-10-15 | Verified live |
| Deployment | Unauthenticated `POST /mcp` returns 401; public `/health` and OAuth metadata checks | Reported |
| Deployment | Claude connected through OAuth and the tools above ran through that connection | Authorization: Reported. Tool calls: Verified live. |
| Deployment | PM2 restart and reboot persistence; behaviour with an invalid token; `/mcp/direct` | **Not yet verified** |
| Build and tests | TypeScript build | Run on 2026-10-16; completed without visible TypeScript errors |
| Build and tests | Test suite | Owner-reported run on 2026-10-16: 80 total, **80 passed, 0 failed, 0 skipped** |

## Workspace restrictions

- Every path resolves against a single workspace root (D-001). Absolute paths and `../` escapes are rejected.
- `write_file` does not overwrite unless `overwrite=true` (D-005). `str_replace` needs exactly one match (D-006). `delete_file` removes single files only (D-007).
- `.git` and `node_modules` cannot be modified through the tools (D-004).
- The server binds to `127.0.0.1`; outside access comes only through the tunnel (D-008).

Status of each control is in the table above. Source code was not inspected when this README was written.

## Setup and configuration

`package.json`, the source code and `.env.example` were not readable when this README was written. The install command, run command, PM2 start command, additional npm scripts and environment variable names are therefore **Not yet verified** and are not given as commands.

- Install and configure the project from `package.json` and `.env.example` in the project root.
- `DECISIONS.md` (D-001) names the sandbox root `WORKSPACE_ROOT` (Reported).
- Keep all secrets in `.env`. Never commit it, and never paste its contents into chat, logs or screenshots.
- The ngrok authtoken belongs in the ngrok CLI configuration, not in project files.
- Never put tokens, access tokens or authorization codes in this README or the handoff files.

## Build and test

Commands recorded in `CHECKPOINTS.md` (PowerShell on Windows):

```powershell
npm.cmd run build
npm.cmd test
```

The production entry point is dist/index.js (Reported). On 2026-10-16, npm.cmd run typecheck, npm.cmd run build, and npm.cmd test all completed successfully. The owner-reported test suite result was 80 total: 80 passed, 0 failed, and 0 skipped. Earlier checkpoints recorded nine skipped symlink tests; those historical results are retained in the checkpoint history and should not be confused with the latest reported run.

## Running and connecting

**Process.** PM2 reported `mcp-file-server` online on 2026-10-15 (Verified live). To inspect it:

```powershell
pm2 status
```

**Local test with MCP Inspector.**

```powershell
npx @modelcontextprotocol/inspector
```

Choose the **Streamable HTTP** transport. Local testing was recorded at `http://127.0.0.1:3000/mcp` during M1 (Reported); confirm the port against your current configuration. The owner has described a local direct endpoint, `/mcp/direct`; its authentication behaviour is **Not yet verified**.

**Public endpoint.** The currently configured endpoint, as reported by the project owner:

```
https://impulse-genetics-collage.ngrok-free.dev/mcp
```

It works only while the ngrok tunnel is online and the static domain remains claimed. Whether the project configuration still points to this domain was not inspected. If the domain changes, update this document and the Claude connector.

**Connecting Claude.** Add a custom connector with a name and the configured `/mcp` URL, then complete the authorization step and enter the server token when prompted. Menu names may differ between Claude versions.

## Suggested demonstration

Each step uses only behaviour listed as verified live above. Do not touch existing project files.

1. Connect Claude to the server and call `list_files` on `.`.
2. Read `PROJECT_STATE.md` first, as the handoff protocol requires, then `search_code` for a word from it.
3. Show a rejected escape: `read_file` with the path `../README.md`.
4. With a new disposable file name, run `write_file`, `read_file`, `str_replace`, `read_file`, `delete_file`, then `read_file` again to show the file is gone.
5. Call git_status to show the current repository state. If demonstrating git_commit, use a separate disposable test file and explain that the successful local commit was verified, but has not yet been pushed.

## Handoff files

Four workspace files carry context between sessions.

| File | Purpose | Update rule |
|---|---|---|
| `PROJECT_STATE.md` | Where the project is now; a new session reads this first | Overwrite at the end of every session |
| `PLAN_LOG.md` | Chronological record of what was planned and what was done | Append only |
| `CHECKPOINTS.md` | Verified results and status snapshots | Add new checkpoints |
| `DECISIONS.md` | Why things are the way they are (IDs D-001 onward) | Append only; supersede instead of editing |

projects/demo/PROJECT_STATE.md is a demonstration copy. The root PROJECT_STATE.md, CHECKPOINTS.md, PLAN_LOG.md, and DECISIONS.md should reflect the October 16 verification and local commit test. Preserve older checkpoint entries as historical records, and ensure the current project status does not contradict them.

## Known limitations

- A successful local git_commit was verified on 2026-10-16. The current remote status of that commit has not been independently verified.
- Nine symlink-dependent tests were skipped in an earlier run, so symlink-specific protection was not proven by that run. The latest October 16 result is owner-reported as 80 passed, 0 failed, and 0 skipped. Ordinary path-traversal and absolute Windows path rejection were verified live previously. The build and test commands were reported run on October 16, 2026; see the verification section above.
- PM2 restart and reboot persistence, invalid-token behaviour and `/mcp/direct` are unverified.
- `delete_file` is permanent and cannot be undone through the tools.
- The stateless transport sends no server-initiated notifications (D-008), and a small check-then-use race remains in path resolution (D-002).
- Schema-validation failures are rejected before the tool handler, so its log does not record them (reported in the demo state file).
- `git_status` has reported repository files outside the workspace listing; how the workspace relates to the repository root was not inspected.
- Public access depends on the ngrok tunnel being online.