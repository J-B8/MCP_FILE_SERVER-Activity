# mcp-file-server

Sandboxed MCP file-server connector: shared memory for multi-agent workflows.
Stack: Node.js + TypeScript MCP SDK, Streamable HTTP (stateless), Zod, ngrok, pm2.

## Status
- [x] M1 Skeleton: server boots, `list_files` verified in MCP Inspector
- [ ] M2 Sandbox + core file tools + path-escape tests
- [ ] M3 Deploy (pm2 + ngrok)
- [ ] M4 Protocol (handoff files, search/git tools, write guards)

## Run (local)
```bash
npm install
cp .env.example .env
npm run dev            # http://127.0.0.1:3000/mcp
```

## Verify with MCP Inspector
```bash
npm run inspect        # UI: Transport = Streamable HTTP, URL = http://127.0.0.1:3000/mcp -> Connect -> Tools -> List Tools
# or scripted:
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:3000/mcp --transport http --method tools/list
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:3000/mcp --transport http \
  --method tools/call --tool-name list_files --tool-arg path=projects --tool-arg recursive=true
```

## Layout
```
src/config.ts        env config (no secrets in code)
src/sandbox.ts       path resolution / containment
src/server.ts        builds the MCP server, registers tools
src/index.ts         HTTP entry (POST /mcp, GET /health)
src/tools/helpers.ts defineTool(): strict Zod, isError mapping, per-call JSON log
src/tools/*.ts       one file per tool
workspace/           the only folder tools can touch
```
