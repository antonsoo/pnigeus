import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.resolve(process.argv[2]);
assert.ok(
  directory.startsWith(`${os.tmpdir()}${path.sep}`) && directory !== os.tmpdir(),
  "Use an isolated audit fixture directory",
);
await mkdir(directory, { recursive: true });
for (const file of [
  "src",
  "public",
  "vite.config.ts",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
  "index.html",
  "shapes.html",
  "timing.html",
])
  await cp(path.join(root, file), path.join(directory, file), { recursive: true });
try {
  await symlink(path.join(root, "node_modules"), path.join(directory, "node_modules"), "dir");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
const notice = path.join(directory, "public/fonts/IBMPlex-OFL.txt");
await writeFile(
  notice,
  `${await readFile(notice, "utf8")}\nSynthetic audit edition C marker; this fixture is never published.\n`,
);
execFileSync("npm", ["run", "build"], { cwd: directory, stdio: "inherit" });
console.log(`Synthetic changed-source edition built at ${path.join(directory, "dist")}`);
