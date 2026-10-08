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