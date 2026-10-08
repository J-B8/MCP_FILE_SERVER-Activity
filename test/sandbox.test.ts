import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveInSandbox, resolveSafe, assertMutable, SandboxError } from "../src/sandbox.js";

let base: string; // temp area containing root/ and outside/
let root: string;
let outside: string;
let symlinksOk = true;

before(() => {
  base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "sbx-")));
  root = path.join(base, "workspace");
  outside = path.join(base, "outside");
  fs.mkdirSync(path.join(root, "sub"), { recursive: true });
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(root, "sub", "ok.txt"), "ok");
  fs.writeFileSync(path.join(outside, "secret.txt"), "TOP SECRET");
  // sibling whose name starts with the root's name: classic prefix-check bug
  fs.mkdirSync(path.join(base, "workspace-evil"));
  try {
    fs.symlinkSync(outside, path.join(root, "link-dir"), "dir");
    fs.symlinkSync(path.join(outside, "secret.txt"), path.join(root, "link-file"));
    fs.symlinkSync(path.join(base, "does-not-exist"), path.join(root, "dangling"));
    fs.symlinkSync(path.join(root, "sub"), path.join(root, "link-inside"), "dir");
  } catch {
    symlinksOk = false; // e.g. Windows without Developer Mode
  }
});
after(() => fs.rmSync(base, { recursive: true, force: true }));

const rejects = (p: string) => assert.throws(() => resolveInSandbox(root, p), SandboxError, `should reject ${JSON.stringify(p)}`);

describe("lexical escapes are rejected", () => {
  const bad = [
    "..", "../", "../x", "../..", "../../etc/passwd", "sub/../../x", "sub/../..",
    "./../x", "a/b/../../../x", "..//x", "sub/./../../outside/secret.txt",
    "../workspace-evil", "../workspace-evil/x",
    "/etc/passwd", "/", "C:\\Windows", "C:/Windows", "c:foo", "\\\\server\\share",
    "ok\0.txt", "\0",
  ];
  for (const p of bad) test(`rejects ${JSON.stringify(p)}`, () => rejects(p));

  test("backslash traversal is rejected on Windows, and harmless on POSIX", () => {
    if (path.sep === "\\") rejects("..\\x");
    else assert.ok(resolveInSandbox(root, "..\\x").startsWith(root + path.sep)); // just a odd filename
  });
});

describe("legitimate paths are allowed", () => {
  for (const p of [".", "", "sub", "sub/ok.txt", "./sub/../sub/ok.txt", "new/deep/file.txt", "a..b", "..hidden"]) {
    test(`allows ${JSON.stringify(p)}`, () => {
      const r = resolveInSandbox(root, p);
      assert.ok(r === root || r.startsWith(root + path.sep));
    });
  }
});

describe("symlink escapes are rejected (resolveSafe)", () => {
  test("directory symlink pointing outside", async (t) => {
    if (!symlinksOk) return t.skip("symlinks unavailable");
    await assert.rejects(resolveSafe(root, "link-dir"), SandboxError);
    await assert.rejects(resolveSafe(root, "link-dir/secret.txt"), SandboxError);
  });
  test("file symlink pointing outside", async (t) => {
    if (!symlinksOk) return t.skip("symlinks unavailable");
    await assert.rejects(resolveSafe(root, "link-file"), SandboxError);
  });
  test("creating a NEW file through an outside symlink dir", async (t) => {
    if (!symlinksOk) return t.skip("symlinks unavailable");
    await assert.rejects(resolveSafe(root, "link-dir/new/evil.txt"), SandboxError);
  });
  test("dangling symlink", async (t) => {
    if (!symlinksOk) return t.skip("symlinks unavailable");
    await assert.rejects(resolveSafe(root, "dangling"), SandboxError);
  });
  test("symlink that stays inside the root is fine", async (t) => {
    if (!symlinksOk) return t.skip("symlinks unavailable");
    assert.equal(await resolveSafe(root, "link-inside/ok.txt"), path.join(root, "sub", "ok.txt"));
  });
  test("nothing outside was touched", () => {
    assert.equal(fs.readFileSync(path.join(outside, "secret.txt"), "utf-8"), "TOP SECRET");
    assert.deepEqual(fs.readdirSync(outside), ["secret.txt"]);
  });
});

describe("resolveSafe basics", () => {
  test("existing file", async () => assert.equal(await resolveSafe(root, "sub/ok.txt"), path.join(root, "sub", "ok.txt")));
  test("not-yet-existing nested file", async () =>
    assert.equal(await resolveSafe(root, "a/b/c.txt"), path.join(root, "a", "b", "c.txt")));
  test("lexical escapes still rejected", async () => {
    await assert.rejects(resolveSafe(root, "../outside/secret.txt"), SandboxError);
    await assert.rejects(resolveSafe(root, "/etc/passwd"), SandboxError);
  });
});

describe("root given in a different spelling than its canonical path", () => {
  // Same class of bug as Windows 8.3 short names (JAKOBA~1) vs long names.
  test("symlink alias of the root: allowed paths work, escapes still rejected", async (t) => {
    if (!symlinksOk) return t.skip("symlinks unavailable");
    const alias = path.join(base, "alias");
    fs.symlinkSync(root, alias, "dir");
    assert.equal(await resolveSafe(alias, "sub/ok.txt"), path.join(alias, "sub", "ok.txt"));
    assert.equal(await resolveSafe(alias, "new/x.txt"), path.join(alias, "new", "x.txt"));
    await assert.rejects(resolveSafe(alias, "link-dir/secret.txt"), SandboxError);
    await assert.rejects(resolveSafe(alias, "../outside/secret.txt"), SandboxError);
  });
});

describe("protected folders", () => {
  test(".git and node_modules are not mutable", () => {
    assert.throws(() => assertMutable(root, path.join(root, ".git", "config")), SandboxError);
    assert.throws(() => assertMutable(root, path.join(root, "p", "node_modules", "x.js")), SandboxError);
    assert.doesNotThrow(() => assertMutable(root, path.join(root, "p", "src", "x.js")));
  });
});
