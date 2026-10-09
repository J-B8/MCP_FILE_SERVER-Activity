# CHECKPOINTS

> Purpose: verified milestone results, so a later session can trust what is done without redoing it.
>
> Update rule: APPEND ONLY. Add one checkpoint when a milestone (or sub-milestone) is verified. Mark items [x] only if actually verified, and say where.

## M1 Checkpoint - Skeleton

Status: COMPLETE

- [x] Server boots and listens on http://127.0.0.1:3000/mcp
- [x] MCP Inspector connects (Streamable HTTP)
- [x] list_files returns the workspace listing
- [x] `../..` is rejected with an isError message

Result: PASS

## M2 Checkpoint - Sandbox and core tools

Status: COMPLETE

- [x] Core file tools implemented: list_files, read_file, write_file, str_replace, delete_file
- [x] Strict Zod schemas; unknown keys rejected (automated test)
- [x] Path traversal rejected (automated test)
- [x] Absolute paths, UNC paths, NUL bytes rejected (automated test)
- [x] .git and node_modules cannot be modified (automated test)
- [x] Missing-file, directory, binary and no-match errors return isError with guidance; no disk path leaks (automated test)
- [x] write -> read -> replace -> delete round trip (automated test and manual MCP Inspector verification)
- [x] Outside files never modified during escape tests (automated test)
- [x] Windows run: 73 tests, 64 passed, 0 failed, 9 skipped
- [x] Manual verification of write_file, read_file, str_replace, delete_file, path escape rejection, absolute path rejection, .git protection, node_modules protection, and missing-file errors
- [x] Symlink-dependent tests correctly skip when the Windows environment does not permit symbolic-link creation

Skipped tests: 9 symlink-dependent tests. They skip because the Windows environment did not permit symbolic-link creation.

Known limitation: symlink-specific automated tests were not executable in the current Windows environment. The implementation remains unchanged.

Result: PASS (with the Windows symlink limitation noted above)

## M3 Checkpoint - Deployment (PARTIAL, IN PROGRESS)

Date: 2026-10-09

Status: IN PROGRESS. M3 is NOT complete and must not be treated as passed.

Verified so far (source in brackets):

- [x] PM2 7.0.4 reports `mcp-file-server` as online [reported by project owner from PM2 output]
- [x] Local `/health` returns `{"status":"ok","name":"mcp-file-server"}` [reported by project owner]
- [x] Public ngrok `/health` returns HTTP 200 [reported by project owner]
- [x] Unauthenticated `POST /mcp` returns HTTP 401 [reported by project owner]
- [x] Claude successfully used `list_files` and `read_file` through the connected MCP server [observed by Claude in chat, 2026-10-09]

Not yet verified:

- [ ] PM2 persistence and restart behavior
- [ ] Authenticated external MCP access (valid bearer token accepted; missing or wrong token rejected)
- [ ] `search_code`, `git_status`, `git_commit` implemented and tested (not observed among the tools exposed through the connection on 2026-10-09; confirm whether they exist)
- [ ] Documentation and demo preparation

Caveats:

- The successful Claude calls do not independently prove which process served them. They are consistent with the PM2-managed server but do not demonstrate it.
- Claude's calls were made without a bearer token, so they say nothing about authenticated access.
- Symlink protection remains incompletely verified. The 9 symlink-dependent tests (see M2) have still not run; the Windows environment did not permit symbolic-link creation. Re-run them where symlinks are allowed and append the result as a new checkpoint.

Remaining work:

1. Verify PM2 persistence and restart behavior.
2. Test authenticated external MCP access.
3. Implement and test `search_code`, `git_status` and `git_commit` if not already present.
4. Complete documentation and demo preparation.

Result: NOT YET PASS (M3 incomplete)