import type { Request, Response } from "express";

const MIN_SECRET_LENGTH = 24;

export function validateSecret(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(`${name} is not configured. Refusing to start.`);
  }

  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters long.`,
    );
  }

  return value;
}

export function requireBearerToken(
  req: Request,
  res: Response,
  expectedToken: string,
): boolean {
  const authorization = req.header("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing Bearer token.",
    });
    return false;
  }

  const token = authorization.slice("Bearer ".length);

  if (token !== expectedToken) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid Bearer token.",
    });
    return false;
  }

  return true;
}

export function requirePathSecret(
  req: Request,
  res: Response,
  expectedSecret: string,
): boolean {
  const suppliedSecret = req.params.secret;

  if (suppliedSecret !== expectedSecret) {
    res.status(404).json({
      error: "Not Found",
      message: "Resource not found.",
    });
    return false;
  }

  return true;
}

export function redactPath(path: string): string {
  return path.replace(/^\/mcp\/[^/]+/, "/mcp/[redacted]");
}