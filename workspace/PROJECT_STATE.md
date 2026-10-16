# State

> Purpose: current status of the project at a glance. Detail and evidence live in CHECKPOINTS.md (verified results), PLAN_LOG.md (plan vs done) and DECISIONS.md (why).
>
> Last updated: 2026-10-16

## Project

Node.js + TypeScript MCP file server using the official TypeScript MCP SDK and stateless Streamable HTTP transport. It exposes eight tools for work within a sandboxed workspace.

## Evidence key

- **Automated**: results from the automated test suite.
- **Live**: a tool or endpoint was called and its result was observed.
- **Reported**: stated by the project owner or recorded in handoff notes, but not independently re-run here.
- **Not verified**: no confirmed result is available.

Automated results and live verification are different forms of evidence and must not be merged (D-013).

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| M1 Skeleton | Complete | Local Streamable HTTP connection and all eight tools were discovered in MCP Inspector. |
| M2 Sandbox and core file tools | Implemented; residual verification gap | Path traversal and absolute-path rejection were verified live. Earlier test runs skipped nine symlink-dependent tests; the live symlink-escape behavior remains unverified. |
| M3 Deployment | Partially verified | PM2 was observed online and the local health endpoint returned OK on 2026-10-15. Restart/reboot persistence and authentication edge cases remain unverified. |
| M4 Remaining tools and protocol | Implemented; verification evidence varies by tool | All eight tools appeared in Inspector. A successful local `git_commit` was verified through MCP Inspector on 2026-10-16. Claude live calls were recorded for seven tools; successful `git_commit` through Claude was not verified. |

## Latest owner-reported build and test results

- `npm.cmd run typecheck`: passed on 2026-10-16.
- `npm.cmd run build`: passed on 2026-10-16.
- `npm.cmd test`: 80 passed, 0 failed, 0 skipped on 2026-10-16.
- These results are owner-reported. Earlier checkpoints record 71 passed and nine skipped symlink-dependent tests. Do not rewrite those historical results as if they were the same run.
- The latest reported test result does not independently prove the behavior of the deployed service or establish that the final source diff was reviewed.

## Live verification and deployment evidence

| Item | Evidence |
|---|---|
| MCP Inspector tool discovery | All eight tools were displayed during a local Streamable HTTP session. |
| Core file tools | Live calls recorded for list/read/search/status and disposable-file create/replace/delete checks. |
| Safeguards | Live rejection recorded for `../` and an absolute Windows path; overwrite refusal and multiple-match replacement refusal were also recorded. |
| `git_commit` path restriction | Live rejection of an outside-workspace path recorded on 2026-10-15; no repository state change. |
| `git_commit` successful commit | Local Inspector test recorded on 2026-10-16. Commit: `5d2860d12947425d0c76c56d0702081bb704fea5`; message: `test: verify git_commit tool`; test file: `workspace/git-commit-test.txt`. |
| Health endpoint / PM2 | `GET /health` returned `{"status":"ok","name":"mcp-file-server"}`; PM2 reported `mcp-file-server` online on 2026-10-15. |
| Public endpoint | An unauthenticated POST to public `/mcp/direct` reportedly returned HTTP 401. This does not establish the behavior of every endpoint or token state. |
| Claude connector | Seven tools had live calls recorded. A successful `git_commit` through Claude was not verified. |

## Still unverified

- Current remote status of commit `5d2860d12947425d0c76c56d0702081bb704fea5`; do not infer push status from an old checkpoint.
- Invalid-token behavior, Bearer-header handling, and authentication behavior of `/mcp/direct`.
- PM2 restart/reboot persistence.
- Live symlink-escape behavior, despite implementation and test coverage claims.
- Whether the final documentation diff is consistent with all current source changes.
- Whether untracked `init.json` and `initialize-request.json` belong in the submission. Do not delete or stage them without review.

## Working-tree context from the latest owner-provided snapshot

The last local status snapshot supplied for review listed modified documentation files and two untracked JSON files. A separate later snapshot in earlier handoff notes also included `src/index.ts`. These are historical snapshots, not a live query of the user's local working tree.

## Remaining work

1. Review the final diff of the intended documentation files against the actual local changes.
2. Confirm which files, if any, should be included in the submission; review the two JSON files before staging.
3. Verify remote status before claiming the local test commit has or has not been pushed.
4. Preserve all authentication, deployment, and symlink caveats until supported by fresh evidence.
