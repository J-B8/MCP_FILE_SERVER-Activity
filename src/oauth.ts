import crypto from "node:crypto";
import type { Express, Request, Response } from "express";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const AUTH_CODE_TTL_MS = 5 * 60 * 1000;

const SUPPORTED_SCOPES = ["mcp", "offline_access"] as const;

type Client = {
  clientId: string;
  redirectUris: string[];
  clientName?: string;
};

type AuthorizationCode = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource?: string;
  expiresAt: number;
};

type AccessToken = {
  clientId: string;
  scope: string;
  expiresAt: number;
};

type RefreshToken = {
  clientId: string;
  scope: string;
  expiresAt: number;
};

const clients = new Map<string, Client>();
const authorizationCodes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, AccessToken>();
const refreshTokens = new Map<string, RefreshToken>();

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function base64UrlSha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("base64url");
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);

    if (parsed.username || parsed.password || parsed.hash) {
      return false;
    }

    if (parsed.protocol === "https:") {
      return true;
    }

    if (parsed.protocol === "http:") {
      return (
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "[::1]"
      );
    }

    return false;
  } catch {
    return false;
  }
}

function renderLoginPage(params: {
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
  resource?: string;
}): string {
  const hidden = (name: string, value: string) =>
    `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authorize MCP access</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 520px;
      margin: 60px auto;
      padding: 20px;
    }

    input[type="password"] {
      width: 100%;
      padding: 10px;
      margin: 8px 0 16px;
      box-sizing: border-box;
    }

    button {
      padding: 10px 16px;
      cursor: pointer;
    }

    .box {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 24px;
    }

    .muted {
      color: #666;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>Authorize MCP access</h1>

    <p>
      Enter your MCP server token to authorize Claude to access
      this server's workspace tools.
    </p>

    <form method="post" action="${escapeHtml(params.authorizeUrl)}">
      ${hidden("client_id", params.clientId)}
      ${hidden("redirect_uri", params.redirectUri)}
      ${hidden("response_type", "code")}
      ${hidden("state", params.state)}
      ${hidden("code_challenge", params.codeChallenge)}
      ${hidden("code_challenge_method", "S256")}
      ${hidden("scope", params.scope)}
      ${
        params.resource
          ? hidden("resource", params.resource)
          : ""
      }

      <label for="server_token">MCP server token</label>
      <input
        id="server_token"
        name="server_token"
        type="password"
        autocomplete="off"
        required
      >

      <button type="submit">Authorize</button>
    </form>
  </div>
</body>
</html>`;
}

function issueTokens(
  clientId: string,
  scope: string,
): {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
} {
  const accessToken = randomToken();
  const refreshToken = randomToken();

  accessTokens.set(accessToken, {
    clientId,
    scope,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
  });

  refreshTokens.set(refreshToken, {
    clientId,
    scope,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope,
  };
}

function validateScope(scope: string): boolean {
  const requested = scope
    .split(/\s+/)
    .filter(Boolean);

  return requested.every((item) =>
    SUPPORTED_SCOPES.includes(
      item as (typeof SUPPORTED_SCOPES)[number],
    ),
  );
}

export function configureOAuth(
  app: Express,
  options: {
    issuer: string;
    serverToken: string;
  },
): (token: string) => boolean {
  const issuer = options.issuer.replace(/\/$/, "");

  app.get(
    "/.well-known/oauth-protected-resource",
    (_req: Request, res: Response) => {
      res.json({
        resource: `${issuer}/mcp`,
        authorization_servers: [issuer],
        scopes_supported: [...SUPPORTED_SCOPES],
      });
    },
  );

  app.get(
    "/.well-known/oauth-protected-resource/mcp",
    (_req: Request, res: Response) => {
      res.json({
        resource: `${issuer}/mcp`,
        authorization_servers: [issuer],
        scopes_supported: [...SUPPORTED_SCOPES],
      });
    },
  );

  app.get(
    "/.well-known/oauth-authorization-server",
    (_req: Request, res: Response) => {
      res.json({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        registration_endpoint: `${issuer}/register`,
        response_types_supported: ["code"],
        grant_types_supported: [
          "authorization_code",
          "refresh_token",
        ],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: [...SUPPORTED_SCOPES],
      });
    },
  );

  app.post("/register", (req: Request, res: Response) => {
    const redirectUris = req.body?.redirect_uris;

    if (
      !Array.isArray(redirectUris) ||
      redirectUris.length === 0 ||
      !redirectUris.every(
        (uri: unknown) =>
          typeof uri === "string" && isValidRedirectUri(uri),
      )
    ) {
      res.status(400).json({
        error: "invalid_redirect_uri",
      });
      return;
    }

    const clientId = randomToken();

    clients.set(clientId, {
      clientId,
      redirectUris,
      clientName:
        typeof req.body?.client_name === "string"
          ? req.body.client_name
          : undefined,
    });

    res.status(201).json({
      client_id: clientId,
      client_name: req.body?.client_name ?? "MCP Client",
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
  });

  app.get("/authorize", (req: Request, res: Response) => {
  console.error("OAuth authorize query:", req.query);

  const {
    response_type,
    client_id,
    redirect_uri,
    state,
    code_challenge,
    code_challenge_method,
    scope = "mcp",
    resource,
  } = req.query;

  if (
    response_type !== "code" ||
    typeof client_id !== "string" ||
    typeof redirect_uri !== "string" ||
    typeof state !== "string" ||
    typeof code_challenge !== "string" ||
    code_challenge_method !== "S256" ||
    typeof scope !== "string"
  ) {
    res.status(400).send("Invalid authorization request.");
    return;
  }

  const client = clients.get(client_id);

  if (!client || !client.redirectUris.includes(redirect_uri)) {
    res.status(400).send("Invalid client or redirect URI.");
    return;
  }

  if (!validateScope(scope)) {
    res.status(400).send("Invalid scope.");
    return;
  }

  if (
    resource !== undefined &&
    typeof resource !== "string"
  ) {
    res.status(400).send("Invalid resource.");
    return;
  }

  res.send(
    renderLoginPage({
      authorizeUrl: "/authorize",
      clientId: client_id,
      redirectUri: redirect_uri,
      state,
      codeChallenge: code_challenge,
      scope,
      resource:
        typeof resource === "string"
          ? resource
          : undefined,
    }),
  );
});

  app.post("/authorize", (req: Request, res: Response) => {
    const {
      response_type,
      client_id,
      redirect_uri,
      state,
      code_challenge,
      code_challenge_method,
      scope = "mcp",
      resource,
      server_token,
    } = req.body ?? {};

    if (
      response_type !== "code" ||
      typeof client_id !== "string" ||
      typeof redirect_uri !== "string" ||
      typeof state !== "string" ||
      typeof code_challenge !== "string" ||
      code_challenge_method !== "S256" ||
      typeof scope !== "string" ||
      !validateScope(scope) ||
      typeof server_token !== "string"
    ) {
      res.status(400).send("Invalid authorization request.");
      return;
    }

    const client = clients.get(client_id);

    if (
      !client ||
      !client.redirectUris.includes(redirect_uri)
    ) {
      res.status(400).send("Invalid client or redirect URI.");
      return;
    }

    if (
      !timingSafeEqualString(
        server_token,
        options.serverToken,
      )
    ) {
      res.status(401).send("Invalid MCP server token.");
      return;
    }

    const code = randomToken();

    authorizationCodes.set(code, {
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      scope,
      resource:
        typeof resource === "string"
          ? resource
          : undefined,
      expiresAt: Date.now() + AUTH_CODE_TTL_MS,
    });

    const redirect = new URL(redirect_uri);
    redirect.searchParams.set("code", code);
    redirect.searchParams.set("state", state);

    res.redirect(302, redirect.toString());
  });

  app.post("/token", (req: Request, res: Response) => {
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      code_verifier,
      refresh_token,
    } = req.body ?? {};

    if (grant_type === "authorization_code") {
      if (
        typeof code !== "string" ||
        typeof redirect_uri !== "string" ||
        typeof client_id !== "string" ||
        typeof code_verifier !== "string"
      ) {
        res.status(400).json({
          error: "invalid_request",
        });
        return;
      }

      const authCode = authorizationCodes.get(code);

      if (!authCode) {
        res.status(400).json({
          error: "invalid_grant",
        });
        return;
      }

      authorizationCodes.delete(code);

      if (authCode.expiresAt < Date.now()) {
        res.status(400).json({
          error: "invalid_grant",
        });
        return;
      }

      if (
        authCode.clientId !== client_id ||
        authCode.redirectUri !== redirect_uri
      ) {
        res.status(400).json({
          error: "invalid_grant",
        });
        return;
      }

      const calculatedChallenge =
        base64UrlSha256(code_verifier);

      if (
        calculatedChallenge !==
        authCode.codeChallenge
      ) {
        res.status(400).json({
          error: "invalid_grant",
        });
        return;
      }

      res.json(
        issueTokens(
          client_id,
          authCode.scope,
        ),
      );
      return;
    }

    if (grant_type === "refresh_token") {
      if (
        typeof refresh_token !== "string" ||
        typeof client_id !== "string"
      ) {
        res.status(400).json({
          error: "invalid_request",
        });
        return;
      }

      const stored = refreshTokens.get(refresh_token);

      if (
        !stored ||
        stored.expiresAt < Date.now() ||
        stored.clientId !== client_id
      ) {
        res.status(400).json({
          error: "invalid_grant",
        });
        return;
      }

      res.json(
        issueTokens(
          client_id,
          stored.scope,
        ),
      );
      return;
    }

    res.status(400).json({
      error: "unsupported_grant_type",
    });
  });

  return (token: string): boolean => {
    const stored = accessTokens.get(token);

    if (!stored) {
      return false;
    }

    if (stored.expiresAt < Date.now()) {
      accessTokens.delete(token);
      return false;
    }

    return true;
  };
}