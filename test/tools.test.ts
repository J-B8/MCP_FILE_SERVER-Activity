import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

let base: string, root: string, outside: string, client: Client;
let symlinksOk = true;

before(async () => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tools-")));
  root = path.join(base, "workspace");
  outside = path.join(base, "outside");
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "secret.txt"), "TOP SECRET");
  fs.mkdirSync(path.join(root, ".git"));
  fs.writeFileSync(path.join(root, ".git", "config"), "[core]");
  try { fs.symlinkSync(outside, path.join(root, "link-dir"), "dir"); } catch { symlinksOk = false; }

  process.env.WORKSPACE_ROOT = root; // must be set BEFORE config.ts loads
  process.env.LOG_CALLS = "0"; // keep test output readable
  const { createServer } = await import("../src/server.js");
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await createServer().connect(st);
  client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(ct);
});
after(() => fs.rmSync(base, { recursive: true, force: true }));

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { text: string }[])[0]!.text;
  return { isError: Boolean(res.isError), text };
}
const expectError = async (name: string, args: Record<string, unknown>, re: RegExp) => {
  const r = await call(name, args);
  assert.equal(r.isError, true, `${name} ${JSON.stringify(args)} should be an error, got: ${r.text}`);
  assert.match(r.text, re);
};

test("exposes the expected tools", async () => {
  const names = (await client.listTools()).tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["delete_file", "list_files", "read_file", "str_replace", "write_file"]);
});

describe("every tool rejects path escapes", () => {
  const escapes = ["../outside/secret.txt", "../../etc/passwd", "/etc/passwd", "sub/../../outside/x"];
  for (const p of escapes) {
    test(`list_files ${p}`, () => expectError("list_files", { path: p }, /escapes|Absolute/));
    test(`read_file ${p}`, () => expectError("read_file", { path: p }, /escapes|Absolute/));
    test(`write_file ${p}`, () => expectError("write_file", { path: p, content: "x", overwrite: true }, /escapes|Absolute/));
    test(`str_replace ${p}`, () => expectError("str_replace", { path: p, old_str: "a", new_str: "b" }, /escapes|Absolute/));
    test(`delete_file ${p}`, () => expectError("delete_file", { path: p }, /escapes|Absolute/));
  }
  test("outside files untouched", () => {
    assert.equal(fs.readFileSync(path.join(outside, "secret.txt"), "utf-8"), "TOP SECRET");
    assert.deepEqual(fs.readdirSync(outside), ["secret.txt"]);
  });
});

describe("symlink escapes via tools", () => {
  test("read through symlink", async (t) => {
    if (!symlinksOk) return t.skip("symlinks unavailable");
    await expectError("read_file", { path: "link-dir/secret.txt" }, /symlink/);
  });
  test("write through symlink", async (t) => {
    if (!symlinksOk) return t.skip("symlinks unavailable");
    await expectError("write_file", { path: "link-dir/evil.txt", content: "pwned" }, /symlink/);
    assert.equal(fs.existsSync(path.join(outside, "evil.txt")), false);
  });
  test("delete through symlink", async (t) => {
    if (!symlinksOk) return t.skip("symlinks unavailable");
    await expectError("delete_file", { path: "link-dir/secret.txt" }, /symlink/);
    assert.equal(fs.existsSync(path.join(outside, "secret.txt")), true);
  });
});

describe("file tool behaviour", () => {
  test("write -> read -> str_replace -> read -> delete round trip", async () => {
    let r = await call("write_file", { path: "proj/notes.md", content: "line one\nline two\nline three\n" });
    assert.equal(r.isError, false);
    assert.match(r.text, /Created proj\/notes.md/);

    r = await call("read_file", { path: "proj/notes.md" });
    assert.match(r.text, /lines 1-3 of 3/);

    r = await call("str_replace", { path: "proj/notes.md", old_str: "line two", new_str: "LINE 2 $& $1" });
    assert.match(r.text, /line 2/);
    r = await call("read_file", { path: "proj/notes.md", start_line: 2, end_line: 2 });
    assert.match(r.text, /LINE 2 \$& \$1/); // $ patterns stay literal

    r = await call("delete_file", { path: "proj/notes.md" });
    assert.equal(r.isError, false);
    await expectError("read_file", { path: "proj/notes.md" }, /not found/);
  });

  test("write_file refuses to overwrite unless overwrite=true", async () => {
    await call("write_file", { path: "a.txt", content: "v1" });
    await expectError("write_file", { path: "a.txt", content: "v2" }, /already exists/);
    assert.equal(fs.readFileSync(path.join(root, "a.txt"), "utf-8"), "v1");
    const r = await call("write_file", { path: "a.txt", content: "v2", overwrite: true });
    assert.match(r.text, /Overwrote/);
    assert.equal(fs.readFileSync(path.join(root, "a.txt"), "utf-8"), "v2");
  });

  test("str_replace fails (file unchanged) on 0 or 2+ matches", async () => {
    await call("write_file", { path: "dup.txt", content: "x\nx\n" });
    await expectError("str_replace", { path: "dup.txt", old_str: "x", new_str: "y" }, /matches 2 places/);
    await expectError("str_replace", { path: "dup.txt", old_str: "zzz", new_str: "y" }, /not found/);
    await expectError("str_replace", { path: "dup.txt", old_str: "x", new_str: "x" }, /identical/);
    assert.equal(fs.readFileSync(path.join(root, "dup.txt"), "utf-8"), "x\nx\n");
  });

  test("delete_file refuses directories and missing files", async () => {
    await call("write_file", { path: "dir/f.txt", content: "1" });
    await expectError("delete_file", { path: "dir" }, /directory/);
    await expectError("delete_file", { path: "nope.txt" }, /not found/);
    await expectError("delete_file", { path: "." }, /directory|root/);
  });

  test(".git is protected from modification", async () => {
    await expectError("write_file", { path: ".git/config", content: "x", overwrite: true }, /\.git/);
    await expectError("str_replace", { path: ".git/config", old_str: "core", new_str: "x" }, /\.git/);
    await expectError("delete_file", { path: ".git/config" }, /\.git/);
    assert.equal(fs.readFileSync(path.join(root, ".git", "config"), "utf-8"), "[core]");
  });

  test("schema is strict: unknown keys and bad types are rejected", async () => {
    await expectError("write_file", { path: "x.txt", content: "x", bogus: 1 }, /Unrecognized|Invalid/);
    await expectError("write_file", { path: "", content: "x" }, /Invalid|too_small|>=1/i);
    await expectError("read_file", { path: "a.txt", max_chars: 5 }, /Invalid|>=100/i);
  });

  test("errors never leak the real disk path", async () => {
    const r = await call("read_file", { path: "missing.txt" });
    assert.ok(!r.text.includes(base), r.text);
  });
});
