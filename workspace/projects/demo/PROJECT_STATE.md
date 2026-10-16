PROJECT_STATE
HISTORICAL DEMONSTRATION SNAPSHOT (2026-10-06, end of M2). Not the current project state. The current state is the root PROJECT_STATE.md. This copy is preserved unchanged to demonstrate the handoff format.

Superseded statements as of 2026-10-16:
- “Tools implemented (5 of 8)”: all eight tools are now implemented and have been exercised through MCP Inspector.
- “73 total / 64 passed / 9 skipped”: the latest owner-reported automated run recorded 80 passed, 0 failed, and 0 skipped.
- “No authentication yet”: authentication has been implemented, but the active mechanism has not yet been fully verified.
- “Next: M3”: M3 has progressed, and the project has moved into deployment and verification work.

Purpose: Provide a single “where are we now” reference for a new agent session.
Update rule: The root PROJECT_STATE.md is the current handoff document. Update it at the end of each session. Preserve historical records in PLAN_LOG.md, CHECKPOINTS.md, and DECISIONS.md.
Last updated: 2026-10-06
Current milestone
M2 — Sandbox: COMPLETE
Next: M3 — Deploy (PM2, ngrok static domain, authentication, and an external MCP client).
What exists
Server: Node.js + TypeScript MCP SDK, stateless Streamable HTTP, POST /mcp, and GET /health, bound to 127.0.0.1:3000.
Tools implemented (8 of 8):
- list_files
- read_file
- write_file
- str_replace
- delete_file
- search_code
- git_status
- git_commit

Safety and quality measures:
- Strict Zod schemas on every tool; unknown keys are rejected.
- isError results provide actionable messages.
- Lexical path protection covers ../, absolute paths, UNC paths, NUL bytes, and sibling-prefix escapes.
- Filesystem-aware protection through resolveSafe() addresses symlinks and canonical workspace roots.
- .git and node_modules are protected from modification by tools.
- Output limits and chunking are implemented, including list_files entry limits and read_file ranges and character limits.
- Successfully parsed tool calls handled by the tool helper produce JSON log lines on stderr.
- Destructive tools are annotated.
- write_file does not overwrite existing files by default.
- str_replace requires exactly one match.
- git_commit refuses pre-existing staged changes.

Automated tests (npm.cmd test)
Latest owner-reported run (2026-10-16):
- 80 total
- 80 passed
- 0 failed
- 0 skipped
- 9 test suites

The nine symlink-dependent tests that were skipped in an earlier Windows run executed and passed in the latest reported run.

Manual verification
Successfully verified through recorded MCP client sessions:
- All eight tools were exercised through MCP Inspector.
- write_file, read_file, str_replace, and delete_file were tested using disposable files.
- Overwrite attempts were refused when overwriting was not enabled.
- str_replace refused ambiguous replacements when the target appeared more than once.
- Path traversal and absolute Windows paths were rejected.
- Modification of protected .git and node_modules paths was covered by recorded testing.
- Missing-file error handling was tested.
- A successful local git_commit was completed through MCP Inspector.
- GET /health returned {"status":"ok","name":"mcp-file-server"}.
- An unauthenticated POST to the public ngrok /mcp/direct endpoint returned HTTP 401 Unauthorized.
- The server was started under PM2, restarted successfully, and remained online afterward.
- The local health endpoint returned status: ok following the PM2 restart.
Deployment and implementation notes
- PM2 manages the mcp-file-server process.
- The server's local health endpoint is available at http://127.0.0.1:3000/health.
- MCP Inspector has been used to inspect the server and exercise its tools.
- Two independent agent sessions completed a documented handoff and verification workflow.
- Historical session records are maintained in PLAN_LOG.md and CHECKPOINTS.md.
Open items and known limitations
- Authentication behavior and the relationship between the local /mcp and public /mcp/direct endpoints still need further testing.
- External MCP tool execution through ngrok after the latest PM2 restart needs verification.
- Full computer-reboot persistence and PM2 resurrection configuration need further testing.
- Live symlink-escape behavior has not been independently demonstrated, although the latest reported automated test run passed all tests.
- The repository's final changes and the two untracked files, init.json and initialize-request.json, need review before deciding whether to include them in the submission.
- The history of missing earlier PLAN_LOG.md entries needs review before finalizing the report.
Needed from the owner
- Review the final Git diff and determine which changes belong in the submission.
- Review init.json and initialize-request.json before staging or deleting either file.
- Continue authentication, remote MCP, and deployment checks.
- Gather screenshots and finalize the report.
Security reminder: Never share the ngrok authtoken or authentication secrets in project files, logs, screenshots, or chat.