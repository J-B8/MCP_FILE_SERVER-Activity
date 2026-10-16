
# MCP File Server

A sandboxed file server for AI agents. It provides eight single-purpose tools through the Model Context Protocol (MCP), allowing agents to read, search, create, edit, delete, and commit files within a shared workspace. Handoff files preserve project context between sessions.

**Last updated:** October 16, 2026

## Technology Stack

- **Node.js and TypeScript** — server implementation
- **Official TypeScript MCP SDK** — MCP integration
- **Streamable HTTP** — communication between clients and the server
- **Zod** — input validation
- **PM2** — process management
- **ngrok** — remote access through a public tunnel
- **Git** — repository status and commit operations

## Available Tools

All file paths are relative to the configured workspace root.

| Tool | Purpose |
|---|---|
| `list_files` | List files and directories |
| `read_file` | Read text files, including selected line ranges |
| `write_file` | Create files or overwrite existing files when permitted |
| `str_replace` | Replace a specific occurrence of text |
| `delete_file` | Delete a single file |
| `search_code` | Search file contents for text |
| `git_status` | Check the Git repository status |
| `git_commit` | Commit explicitly selected files |

## Security and Workspace Design

- Restricts file operations to the configured workspace.
- Rejects absolute paths and directory-traversal attempts.
- Prevents accidental overwriting of existing files by default.
- Requires text replacement targets to be unique.
- Limits deletion to individual files.
- Protects `.git` and `node_modules` from modification through the file tools.
- Validates tool inputs using Zod.
- Requires explicit commit messages and file paths for Git commits.

## Setup and Configuration

1. Install project dependencies from the repository root.
2. Configure the required environment variables in `.env`.
3. Configure ngrok for remote access.
4. Build the TypeScript project.
5. Start the server and connect an MCP client.

Keep credentials and tokens out of source control and documentation.

## Build and Test

Run the following commands in PowerShell from the project root:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

The latest reported test run on October 16, 2026, completed successfully:

- **80 tests passed**
- **0 failed**
- **0 skipped**

Type checking and the production build also completed successfully.

## Running and Connecting

The server can be managed with PM2:

```powershell
pm2 status
```

For local testing, launch MCP Inspector:

```powershell
npx @modelcontextprotocol/inspector
```

Select the **Streamable HTTP** transport and use the configured local MCP endpoint.

For remote access, connect through the configured ngrok tunnel. The tunnel must remain online for remote clients to connect.

## Git Operations

The `git_status` tool provides repository status information, while `git_commit` commits explicitly selected files using the supplied commit message.

The project supports Git operations through the MCP tool interface, including workspace-path protection and local commit creation.

## Suggested Demonstration

1. Connect an MCP client to the server.
2. Use `list_files` to display the workspace contents.
3. Use `read_file` to read a project document.
4. Use `search_code` to find a word or phrase.
5. Demonstrate creating, reading, editing, and deleting a disposable file.
6. Attempt a directory-traversal path to demonstrate workspace protection.
7. Use `git_status` to display the repository state.
8. Demonstrate `git_commit` using an appropriate test file when needed.

## Handoff Files

The following files preserve project context between sessions:

| File | Purpose |
|---|---|
| `PROJECT_STATE.md` | Current project status and next steps; read this first when starting a new session |
| `PLAN_LOG.md` | Chronological record of plans and completed work |
| `CHECKPOINTS.md` | Project checkpoints and recorded results |
| `DECISIONS.md` | Design decisions and their rationale |
| `projects/demo/PROJECT_STATE.md` | Historical project state used for the demonstration |

Keep the handoff files updated as the project evolves. Preserve chronological logs and historical checkpoints so future sessions can understand the project's progress.

## Conclusion

The MCP File Server provides a focused interface for AI agents to manage files and perform selected Git operations within a shared workspace. Its modular tools, workspace restrictions, input validation, Git integration, and handoff documentation support organized and repeatable workflows across sessions.
