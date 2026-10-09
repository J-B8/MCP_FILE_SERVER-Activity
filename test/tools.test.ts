import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { execFileSync } from "node:child_process";

let base: string, root: string, outside: string, client: Client;
let symlinksOk = true;

before(async () => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tools-")));
  root = path.join(base, "workspace");
  outside = path.join(base, "outside");
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "secret.txt"), "TOP SECRET");
  execFileSync("git", ["init", "-q"], { cwd: root });
  try { fs.symlinkSync(outside, path.join(root, "link-dir"), "dir"); } catch { symlinksOk = false; }

  process.env.WORKSPACE_ROOT = root; // must be set BEFORE config.ts loads
  process.env.LOG_CALLS = "0"; // keep test output readable
  process.env.GIT_ROOT = root;

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

test("exposes the currently implemented tools", async () => {
  const names = (await client.listTools()).tools.map((t) => t.name).sort();

    assert.deepEqual(names, [
      "delete_file",
      "git_commit",
      "git_status",
      "list_files",
      "read_file",
      "search_code",
      "str_replace",
      "write_file",
    ]);
});

test("git_status reports the current branch and untracked files", async () => {
  const r = await call("git_status", {});

  assert.equal(r.isError, false, r.text);
  assert.match(r.text, /## .*main/i);

  fs.writeFileSync(path.join(root, "git-status-demo.txt"), "test");

  const updated = await call("git_status", {});

  assert.equal(updated.isError, false, updated.text);
  assert.match(updated.text, /git-status-demo\.txt/);
});

test("git_commit commits an explicitly selected file", async () => {
  const filePath = path.join(root, "commit-demo.txt");
  fs.writeFileSync(filePath, "Commit test content");

  const result = await call("git_commit", {
    message: "test: verify git_commit tool",
    paths: ["commit-demo.txt"],
  });

  assert.equal(result.isError, false, result.text);
  assert.match(result.text, /commit/i);

  const committedContent = execFileSync(
    "git",
    ["show", "HEAD:commit-demo.txt"],
    { cwd: root, encoding: "utf-8" },
  );

  assert.equal(committedContent, "Commit test content");
});

test("git_commit rejects paths outside the workspace", async () => {
  const result = await call("git_commit", {
    message: "test: reject unsafe path",
    paths: ["../outside/secret.txt"],
  });

  assert.equal(result.isError, true);
  assert.match(result.text, /escape|inside the workspace|rejected/i);
});

test("git_commit refuses pre-existing staged changes", async () => {
  const stagedPath = path.join(root, "already-staged.txt");
  const commitPath = path.join(root, "new-commit.txt");

  fs.writeFileSync(stagedPath, "Staged separately");
  fs.writeFileSync(commitPath, "Selected for commit");

  execFileSync("git", ["add", "--", "already-staged.txt"], {
    cwd: root,
  });

  const result = await call("git_commit", {
    message: "test: staged-change protection",
    paths: ["new-commit.txt"],
  });

  assert.equal(result.isError, true);
  assert.match(result.text, /existing staged changes/i);

  // The pre-existing staged file must remain staged, not committed.
  assert.equal(
    execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: root,
      encoding: "utf-8",
    }).trim(),
    "already-staged.txt",
  );

  // Clean up so this test does not affect later tests.
  execFileSync("git", ["reset", "--", "already-staged.txt"], {
    cwd: root,
  });
});

test("search_code finds matching lines and reports relative paths", async () => {
  fs.mkdirSync(path.join(root, "search-demo"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "search-demo", "example.ts"),
    'const greeting = "Hello MCP";\nconst count = 42;\n',
  );

  const r = await call("search_code", {
    query: "hello mcp",
    path: "search-demo",
  });

  assert.equal(r.isError, false, r.text);
  assert.match(r.text, /search-demo\/example\.ts:1/);
  assert.match(r.text, /Hello MCP/);
  assert.ok(!r.text.includes(base), "Search results must not reveal absolute disk paths");
});

test("search_code rejects paths outside the workspace", async () => {
  await expectError(
    "search_code",
    { query: "TOP SECRET", path: "../outside/secret.txt" },
    /escapes|Absolute/,
  );

  assert.equal(
    fs.readFileSync(path.join(outside, "secret.txt"), "utf-8"),
    "TOP SECRET",
  );
});

test("search_code respects max_results", async () => {
  fs.mkdirSync(path.join(root, "search-limit"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "search-limit", "matches.txt"),
    "needle one\nneedle two\nneedle three\n",
  );

  const r = await call("search_code", {
    query: "needle",
    path: "search-limit",
    max_results: 2,
  });

  assert.equal(r.isError, false, r.text);
  assert.match(r.text, /Matches: 2\+/);
  assert.match(r.text, /capped at 2/i);
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
  const configPath = path.join(root, ".git", "config");
  const originalContent = fs.readFileSync(configPath, "utf-8");

  await expectError(
    "write_file",
    { path: ".git/config", content: "x", overwrite: true },
    /\.git/,
  );

  await expectError(
    "str_replace",
    { path: ".git/config", old_str: "core", new_str: "x" },
    /\.git/,
  );

  await expectError(
    "delete_file",
    { path: ".git/config" },
    /\.git/,
  );

  assert.equal(
    fs.readFileSync(configPath, "utf-8"),
    originalContent,
    "The .git config file must remain unchanged",
  );
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
