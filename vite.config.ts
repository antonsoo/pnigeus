import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";

const base = "/pnigeus/";

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? filesIn(path.join(directory, entry.name))
        : Promise.resolve([path.join(directory, entry.name)]),
    ),
  );
  return nested.flat();
}

export default defineConfig(async ({ command }) => {
  const inputFiles = [
    ...(await filesIn("src")),
    ...(await filesIn("public")),
    "index.html",
    "shapes.html",
    "timing.html",
    "vite.config.ts",
    "tsconfig.json",
    "package.json",
    "package-lock.json",
  ].sort();
  const inputHash = createHash("sha256");
  for (const file of inputFiles) {
    inputHash.update(file);
    inputHash.update(await readFile(file));
  }
  const edition = command === "build" ? inputHash.digest("hex") : "development";
  return {
    base,
    build: {
      rolldownOptions: {
        input: {
          main: path.resolve("index.html"),
          shapes: path.resolve("shapes.html"),
          timing: path.resolve("timing.html"),
        },
      },
    },
    define: {
      __PNIGEUS_EDITION__: JSON.stringify(edition),
      __ASSET_IDENTITIES__: JSON.stringify(
        Object.fromEntries(
          await Promise.all(
            (await filesIn("public")).map(async (file) => {
              const bytes = await readFile(file);
              return [
                file.slice(7),
                {
                  bytes: bytes.byteLength,
                  sha256: createHash("sha256").update(bytes).digest("hex"),
                },
              ];
            }),
          ),
        ),
      ),
    },
    plugins: [
      {
        name: "offline-listening-room",
        apply: "build",
        async closeBundle() {
          const files = (await filesIn("dist")).filter((f) => !f.endsWith("sw.js")).sort();
          const urls = files.map(
            (file) => base + path.relative("dist", file).split(path.sep).join("/"),
          );
          const types: Record<string, string> = {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".jpg": "image/jpeg",
            ".woff2": "font/woff2",
            ".ttf": "font/ttf",
            ".txt": "text/plain",
            ".json": "application/json",
          };
          const inventory = Object.fromEntries(
            await Promise.all(
              files.map(async (file, index) => {
                const bytes = await readFile(file);
                return [
                  urls[index],
                  {
                    bytes: bytes.byteLength,
                    sha256: createHash("sha256").update(bytes).digest("hex"),
                    type: types[path.extname(file)] ?? "application/octet-stream",
                  },
                ];
              }),
            ),
          );
          const transfer = (await readFile("src/asset-transfer.js", "utf8")).replace(
            /^export /gm,
            "",
          );
          const worker = await readFile("src/offline-worker.js", "utf8");
          await writeFile(
            "dist/sw.js",
            `/* Offline edition ${edition}. Generated from the complete build. */
const CACHE = "pnigeus-${edition}";
const EDITION = ${JSON.stringify(edition)};
const BASE = ${JSON.stringify(base)};
const FILES = ${JSON.stringify(urls)};
const INVENTORY = ${JSON.stringify(inventory)};
${transfer}
${worker}
`,
          );
        },
      },
    ],
  };
});
