
# MCP File Server

A Node.js and TypeScript Model Context Protocol (MCP) server that provides controlled file-system and Git operations within a configured workspace. It uses the official MCP TypeScript SDK, Streamable HTTP, Zod input validation, and token-based authentication.

## Features

- File and directory listing
- File reading and searching
- File creation and editing
- File deletion
- Git status and Git commit operations
- Strict input validation using Zod
- Workspace path restrictions and symlink escape protection
- Bearer-token authentication and OAuth-based access
- HTTP health-check endpoint
- Automated tests for sandbox security and tool behavior
- Project handoff documentation for continuing work across agent sessions

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Runtime | Node.js | Runs the server |
| Language | TypeScript | Provides typed application code |
| MCP SDK | Official TypeScript MCP SDK | Implements the MCP server |
| Transport | Streamable HTTP | Connects remote MCP clients |
| Validation | Zod | Validates tool inputs |
| Web server | Express | Handles HTTP requests and routes |
| Configuration | dotenv | Loads environment variables |
| Process manager | PM2 | Manages the running server process |
| Tunnel | ngrok | Provides HTTPS access to the local server |
| Testing | Node.js test runner and MCP Inspector | Tests behavior and MCP integration |

## Requirements

- Node.js and npm
- Git
- An MCP-compatible client, such as MCP Inspector
- PM2 and ngrok for the deployment setup

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/J-B8/mcp.git
cd mcp
npm install
```

Create a `.env` file based on `.env.example`.

Example configuration:

```env
PORT=3000
HOST=127.0.0.1
WORKSPACE_ROOT=./workspace
GIT_ROOT=.
```

Configure the required authentication secrets in `.env`. The application validates that required secrets meet a minimum length of 24 characters.

Never commit real authentication secrets, access tokens, or other credentials to the repository.

**Configuration note:** `WORKSPACE_ROOT` defines the permitted file-operation workspace. `GIT_ROOT` defines the repository used for Git operations; configure it intentionally for your environment.

## Running the Server

Start the development server:

```bash
npm run dev
```

Build the TypeScript project:

```bash
npm run build
```

Run the compiled server:

```bash
npm start
```

Run the type checker:

```bash
npm run typecheck
```

Run the automated test suite:

```bash
npm test
```

Launch MCP Inspector:

```bash
npm run inspect
```

The default local MCP endpoint is:

```text
http://127.0.0.1:3000/mcp
```

Use the correct authentication method when connecting an MCP client. For remote access, use the currently active HTTPS tunnel URL rather than assuming a previous ngrok URL is still active.

## HTTP Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /mcp` | Handles MCP requests authenticated with a valid OAuth access token |
| `POST /mcp/direct` | Handles MCP requests using the configured server bearer token |
| `GET /health` | Returns a health-check response |
| `GET /mcp` | Returns `405 Method Not Allowed` |
| `DELETE /mcp` | Returns `405 Method Not Allowed` |
| OAuth routes | Support the configured authorization and token flows |

The health endpoint indicates that the service is responding. It does not independently verify every tool, authentication flow, or deployment component.

## Available MCP Tools

The server exposes eight tools:

| Tool | Purpose |
|---|---|
| `list_files` | Lists files and directories within the permitted workspace |
| `read_file` | Reads a file |
| `write_file` | Creates a file and supports controlled overwriting |
| `str_replace` | Replaces a unique matching text occurrence in a file |
| `delete_file` | Deletes a permitted file |
| `search_code` | Searches files for matching content |
| `git_status` | Retrieves Git status information |
| `git_commit` | Commits explicitly selected files subject to implemented restrictions |

Tool inputs are validated using Zod. The tools include checks for invalid paths and other prohibited operations. Replacement and write operations also enforce their respective conditions to reduce accidental changes.

## Security and Sandboxing

The server implements controls intended to prevent unauthorized access and accidental damage:

- **Path validation:** Rejects path traversal attempts and absolute paths that escape the workspace.
- **Symlink protection:** Resolves filesystem paths and checks for symbolic-link escapes.
- **Protected directories:** Prevents mutation of protected directories such as `.git` and `node_modules`.
- **Authentication:** Protects MCP routes using the configured bearer-token or OAuth flow.
- **Secret validation:** Requires configured authentication secrets to meet the minimum length requirement.
- **Git restrictions:** Checks Git operations against workspace and staged-change restrictions.
- **Input validation:** Uses Zod to validate tool arguments before processing.
- **Error handling:** Returns controlled errors for invalid operations rather than intentionally exposing real filesystem paths.

These controls reduce risk but should not be interpreted as a guarantee against every possible attack. Authentication, network exposure, filesystem behavior, and deployment configuration must also be tested.

## Remote Access and Process Management

The project supports remote access through ngrok and process management through PM2.

For deployment:

1. Configure the environment variables and authentication secrets.
2. Build and start the server.
3. Start or verify the PM2-managed process.
4. Configure the HTTPS tunnel.
5. Connect an MCP-compatible client using the correct endpoint and authentication.
6. Test the tools through the actual client.

Do not publish credentials in the README, logs, screenshots, or demo transcript.

## Automated Test Results

**Latest recorded test run: 80 passed, 0 failed, 0 skipped.**

The test suite covers:

- Rejection of lexical path escapes and absolute paths
- Handling of legitimate workspace paths
- Symlink escapes through files and directories
- Dangling symlinks and symlinks that remain inside the workspace
- Attempts to access outside files through the file tools
- Protection of designated directories
- File-operation behavior and replacement conditions
- Tool schemas and error handling
- Git status, commit restrictions, and staged-change safeguards
- Search behavior and result limits

The latest test output confirms that all 80 tests passed in that run. Re-run the tests before submission if the code or configuration changes.

## Project Handoff Protocol

The project uses four handoff components to support continuity across agent sessions:

- `PROJECT_STATE.md` — records the current project state.
- `PLAN_LOG/` — records plans and tool-call activity.
- `CHECKPOINTS/` — records progress and handoff checkpoints.
- `DECISIONS/` — records important decisions and their rationale.

Keep these files consistent with the actual repository state. Before a new session or major change, review the current state and relevant decisions. Record the plan before acting and update the checkpoint when handing work off.

## Verification and Known Limitations

Automated tests and live integration checks provide different kinds of evidence. A passing test suite does not by itself prove that every remote authentication flow, PM2 restart scenario, or client integration works.

Before submission, confirm the current results for:

- TypeScript build and type checking
- Automated tests
- All eight tools through MCP Inspector
- Connection from a real MCP client
- HTTPS tunnel and process manager
- Authentication on the intended public endpoint
- A multi-step task completed across at least two agent sessions

Report any remaining unverified behavior honestly.