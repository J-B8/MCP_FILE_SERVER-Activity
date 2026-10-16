import express from "express";
import type { Request, Response } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { createServer } from "./server.js";
import {
  requireBearerToken,
  redactPath,
} from "./auth.js";
import { configureOAuth } from "./oauth.js";

const app = createMcpExpressApp({
  host: "0.0.0.0",
  allowedHosts: [
    "impulse-genetics-collage.ngrok-free.dev",
    "127.0.0.1",
    "localhost",
  ],
});

app.use((req, _res, next) => {
  console.error(`${req.method} ${redactPath(req.path)}`);
  next();
});

/*
 * OAuth
 *
 * This allows Claude and other OAuth-capable MCP clients
 * to discover the authorization server, register a client,
 * authorize access, and exchange authorization codes
 * for Bearer access tokens.
 */
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const validateAccessToken = configureOAuth(app, {
  issuer:
    process.env.OAUTH_ISSUER ??
    "http://127.0.0.1:3000",
  serverToken: config.authToken,
});

async function handleMcpRequest(
  req: Request,
  res: Response,
) {
  const server = createServer();

  const transport =
    new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

  transport.onerror = (error) => {
    console.error("MCP transport error:", error);
  };

  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(
      req,
      res,
      req.body,
    );
  } catch (err) {
    console.error("MCP request failed:", err);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
}

/*
 * OAuth Bearer authentication
 *
 * Claude will send:
 *
 * Authorization: Bearer <OAuth access token>
 *
 * We validate that token before allowing access
 * to the MCP endpoint.
 */
app.post("/mcp", async (req: Request, res: Response) => {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing Bearer token.",
    });
    return;
  }

  const token = authorization.slice("Bearer ".length);

  if (!validateAccessToken(token)) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired access token.",
    });
    return;
  }

  await handleMcpRequest(req, res);
});

/*
 * Legacy/direct Bearer-token authentication.
 *
 * This keeps your original MCP server authentication
 * available for Inspector and direct testing.
 */
app.post(
  "/mcp/direct",
  async (req: Request, res: Response) => {
    if (
      !requireBearerToken(
        req,
        res,
        config.authToken,
      )
    ) {
      return;
    }

    await handleMcpRequest(req, res);
  },
);

/*
 * OAuth discovery endpoints
 *
 * These are registered by configureOAuth().
 */

const methodNotAllowed = (
  _req: Request,
  res: Response,
) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message:
        "Method not allowed. Use POST /mcp.",
    },
    id: null,
  });
};

app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    name: "mcp-file-server",
  });
});

app.listen(
  config.port,
  config.host,
  () => {
    console.error(
      `mcp-file-server listening on http://${config.host}:${config.port}/mcp`,
    );

    console.error(
      `workspace root: ${config.workspaceRoot}`,
    );
  },
);