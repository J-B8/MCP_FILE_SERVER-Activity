# DECISIONS

> Purpose: why things are the way they are, so later sessions do not re-debate or silently reverse them.
>
> Update rule: APPEND ONLY. To change a decision, add a new entry that supersedes the old one (reference its ID). Never edit old entries.
>
> Format: ID, Decision, Why, Trade-off.

## D-001 All tool paths are relative to one workspace root

- Decision: every path is resolved against WORKSPACE_ROOT; absolute paths are rejected.
- Why: one rule agents can learn, and one place to enforce confinement.
- Trade-off: agents cannot reference files elsewhere on disk, which is the point.

## D-002 Two-layer path protection; filesystem-aware resolveSafe() used by all tools

- Decision: resolveInSandbox (lexical) plus resolveSafe (realpath, symlink aware). Every tool uses resolveSafe.
- Why: lexical checks alone can be bypassed by symlinks; resolveSafe also protects paths that do not exist yet (writes).
- Trade-off: a small check-then-use race remains; acceptable for a single-user workspace.

## D-003 resolveSafe canonicalises the root the same way as the path

- Decision: compare against realpath(root) and return the path spelled relative to the configured root.
- Why: on Windows the root and the resolved path were spelled differently (8.3 short vs long names) and the comparison failed.
- Trade-off: one extra realpath call per request.

## D-004 .git and node_modules are protected from modification

- Decision: assertMutable() refuses write/replace/delete inside them.
- Why: prevents agents corrupting repository internals or dependencies.
- Trade-off: git internals can only change through the future git tools.

## D-005 write_file does not overwrite by default

- Decision: fails if the file exists unless overwrite=true; writes are atomic (temp file + rename).
- Why: forces read-before-write and prevents accidental clobbering.
- Trade-off: one extra call when replacing a file on purpose.

## D-006 str_replace requires exactly one match

- Decision: 0 or 2+ matches fail and leave the file unchanged; the error says how to fix the call.
- Why: precise edits, no accidental mass replacement, cheaper than rewriting files.
- Trade-off: agents may need to widen old_str with context.

## D-007 Destructive tools are marked and delete is single-file only

- Decision: write_file, str_replace, delete_file carry destructiveHint; delete_file removes files only, never directories or the root.
- Why: clients and agents can see which tools change state; limits blast radius.
- Trade-off: deleting a folder means deleting its files one by one. Full confirmation guards come in M4.

## D-008 Stateless Streamable HTTP, server bound to 127.0.0.1

- Decision: new server + transport per request; no sessions; loopback bind.
- Why: restarts are harmless, many agents can connect, only a local tunnel can reach it.
- Trade-off: no server-initiated notifications. No auth yet, so never expose publicly before M3.

## D-009 One registration helper for every tool

- Decision: defineTool() applies strict schema, isError mapping, annotations and per-call logging.
- Why: a new tool cannot forget validation, error handling or logging.
- Trade-off: slightly less flexible than registering tools by hand.

## D-010 Symlink tests may skip when the OS cannot create symlinks

- Decision: symlink-dependent tests skip themselves instead of failing when the OS refuses symbolic-link creation.
- Why: the Windows test environment did not permit symbolic-link creation, so the tests must report the limitation honestly rather than treating the environment restriction as an implementation failure.
- Trade-off: a skipped run proves less on that machine (here: 9 tests). The implementation is deliberately not changed just to avoid the skips.