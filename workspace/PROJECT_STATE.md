# State

> Purpose: current status of the project at a glance. Detail and evidence live in CHECKPOINTS.md (verified results), PLAN_LOG.md (plan vs done) and DECISIONS.md (why).
>
> Last updated: 2026-10-15

## Project

Node.js + TypeScript MCP file server using the official TypeScript MCP SDK and Streamable HTTP transport. It exposes eight tools for working within a sandboxed workspace.

## Evidence key

- **Automated**: results from the automated test suite.
- **Live**: a tool or endpoint was called and its result was checked during this session.
- **Reported**: recorded by the project owner or in earlier handoff notes, but not independently verified here.
- **Not verified**: no confirmed result is available.

Automated results and live verification are different forms of evidence and must not be merged (D-013).

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| M1 Skeleton | COMPLETE, PASSED | MCP Inspector connected to the local Streamable HTTP endpoint. All eight tools were discovered. |
| M2 Sandbox and core file tools | COMPLETE; symlink verification gap remains | Core file operations and path protections have automated coverage. Nine symlink-dependent tests were skipped. |
| M3 Deployment | IN PROGRESS | PM2 is online and the local health endpoint responds. Restart/reboot persistence and authentication edge cases remain unverified. |
| M4 Remaining tools and protocol | Implemented; completion not fully verified | All eight tools appear in Inspector. Live calls succeeded for several tools; successful git_commit remains untested live. |

## Latest automated results

- Build: `npm.cmd run build` completed without visible TypeScript errors on 2026-10-15.
- Tests: `npm.cmd test` reported 80 total, 71 passed, 0 failed, and 9 skipped.
- The nine skipped tests concern symbolic-link scenarios that could not run because symbolic links were unavailable in the test environment. Skipped tests are not counted as passed.
- These results reflect the commands run during this session. They do not independently establish the state of every working-tree file at the time of execution.

## Live verification through MCP Inspector

| Tool or control | Result |
|---|---|
| MCP connection and tool discovery | Connected to `http://localhost:3000/mcp` using Streamable HTTP; all eight tools displayed. |
| `list_files` | Passed; workspace entries returned. |
| `read_file` | Passed; README.md returned all 147 lines. |
| `search_code` | Passed; returned four matching lines across seven scanned files. |
| `git_status` | Passed; output matched the terminal working-tree status. |
| `write_file` create | Passed with a disposable file. |
| `write_file` overwrite refusal | Passed; `overwrite=false` refused an existing file and the original content remained unchanged. |
| `str_replace` single-match replacement | Passed in an earlier disposable-file check. |
| `str_replace` multiple-match refusal | Passed; two matches were detected and the file remained unchanged. |
| `delete_file` | Passed; disposable test files were deleted. |
| Health endpoint | `GET /health` returned `{"status":"ok","name":"mcp-file-server"}`. |
| MCP endpoint GET | Returned HTTP 405 with `Use POST /mcp`, consistent with the endpoint expecting POST requests. |
| Path protection | Traversal and an absolute Windows path were previously rejected live. |
| `git_commit` outside-workspace path rejection | Previously verified live; no repository state changed. |
| `git_commit` successful commit | Not yet verified live. |

## Automated-only and unverified behavior

- `git_commit`: successful live commit has not been run. Refusal when changes are already staged is covered by automated tests, as reported.
- Symlink protection is implemented, but the nine symlink-dependent tests did not execute in this environment.
- Invalid-token behavior, any Bearer-header path, `/mcp/direct` authentication, and PM2 restart/reboot persistence remain unverified.
- The successful MCP tool calls do not independently prove which operating-system process served every request.

## Deployment status

- PM2 currently reports `mcp-file-server` as `online` after it was started during this session.
- Local `GET /health` returned the expected JSON response.
- MCP Inspector connected to `http://localhost:3000/mcp` using Streamable HTTP and displayed all eight tools.
- `GET /mcp` returned HTTP 405 and instructed the client to use POST. This is not by itself evidence of a server failure.
- Public ngrok access, OAuth metadata, invalid-token handling, `/mcp/direct`, and PM2 persistence are not reverified in this session; see earlier reports for their previous status.

## Working tree

Latest `git_status` output during this session:

```text
## master...origin/master
 M src/index.ts
 M workspace/CHECKPOINTS.md
 M workspace/DECISIONS.md
 M workspace/PROJECT_STATE.md
 M workspace/README.md
?? init.json
?? initialize-request.json
```

Nothing is staged, and no commits were made during tonight's verification. The two untracked JSON files have not yet been reviewed for inclusion in the submission. Do not delete them without approval.

## Remaining work

1. Refresh CHECKPOINTS.md and append tonight's progress to PLAN_LOG.md.
2. Review `init.json` and `initialize-request.json` and decide whether they belong in the submission; do not delete them without approval.
3. Verify PM2 restart/persistence and remaining authentication behavior if time allows.
4. Keep the nine skipped symlink tests documented unless they can be executed in a suitable environment.
5. Review the final Git diff and select only approved files for any eventual commit.
6. Prepare a repeatable demo using the already verified tools and safeguards.
