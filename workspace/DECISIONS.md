
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
- Why: clients and agents can see which tools change state; limits blast radius. Full confirmation guards come in M4.
- Trade-off: deleting a folder means deleting its files one by one.

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

## D-011 Public access requires authentication; Claude connects through OAuth

- Supersedes: the "No auth yet" note in the trade-off of D-008 (D-008 itself is unchanged).
- Decision: the public `/mcp` endpoint rejects unauthenticated requests with HTTP 401, and Claude's connection was authorized through OAuth. Both are owner-reported. The mechanism, the status of the earlier Bearer-token design and the behaviour of `/mcp/direct` are not verified.
- Why: not recorded. The owner has not stated the reason.
- Trade-off: invalid-token behaviour, any Bearer-header path and `/mcp/direct` are untested. Public access also depends on the ngrok tunnel being online.

## D-012 git_commit commits only explicitly named paths and refuses when changes are already staged

- Decision: git_commit takes explicit paths inside the workspace (1 to 50) and a message. A path outside the workspace is rejected (verified live 2026-10-15). It refuses to run when changes are already staged (covered by automated tests per the owner; not verified live).
- Why: **Inference, not a confirmed owner decision.** The behaviour means a commit contains only what the agent named and cannot absorb staged work from elsewhere. The owner has not recorded the actual reason.
- Trade-off: staged changes must be handled outside the tool first. Files outside the workspace root, such as project source, cannot be committed through this tool. A successful live commit has not yet been tested.

## D-013 Handoff documents keep automated results separate from live verification

- Decision: notes label evidence as Automated, Live, Reported or Not verified, and do not merge them. Run dates and working-tree state are recorded only when known.
- Why: passing tests do not prove the deployed connection works, and a live call does not prove edge cases. The owner asked for this distinction during the final review.
- Trade-off: notes are longer and need dates.
