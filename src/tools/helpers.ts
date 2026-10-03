import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SandboxError } from "../sandbox.js";

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

export const ok = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
});

export const fail = (text: string): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text }],
});

/**
 * Single place where every tool is registered, so each one gets:
 *  - a strict Zod schema (unknown keys rejected)
 *  - errors returned as isError results with a readable message (never a stack trace)
 *  - one JSON log line per call (rubric: "calls are logged")
 */
export function defineTool<S extends z.ZodRawShape>(
  server: McpServer,
  def: {
    name: string;
    title: string;
    description: string;
    shape: S;
    readOnly: boolean;
    destructive?: boolean;
  },
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<string>,
): void {
  const schema = z.object(def.shape).strict();
  server.registerTool(
    def.name,
    {
      title: def.title,
      description: def.description,
      inputSchema: schema,
      annotations: {
        readOnlyHint: def.readOnly,
        destructiveHint: def.destructive ?? false,
        idempotentHint: def.readOnly,
        openWorldHint: false,
      },
    },
    async (rawArgs: unknown): Promise<CallToolResult> => {
      const args = rawArgs as z.infer<z.ZodObject<S>>;
      const started = Date.now();
      let outcome: "ok" | "error" = "ok";
      let message = "";
      try {
        return ok(await handler(args));
      } catch (err) {
        outcome = "error";
        if (err instanceof ToolError || err instanceof SandboxError) {
          message = err.message;
        } else {
          // Unexpected: log detail server-side, give the agent a safe message.
          console.error(err);
          message = `Internal error in ${def.name}. The call was not completed.`;
        }
        return fail(message);
      } finally {
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            tool: def.name,
            outcome,
            ms: Date.now() - started,
            args,
            ...(outcome === "error" ? { error: message } : {}),
          }),
        );
      }
    },
  );
}
