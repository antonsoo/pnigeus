import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, firefox } from "playwright";
import { auditServer } from "./audit-server.mjs";

const [oldDirectory, outputDirectory] = process.argv.slice(2);
assert(oldDirectory && outputDirectory, "Supply the archived old Pages tree and output directory.");
const output = path.resolve(outputDirectory);
await mkdir(output, { recursive: true });
const oldEdition = JSON.parse(
  /const EDITION = ("[^"]+");/.exec(await readFile(path.join(oldDirectory, "sw.js"), "utf8"))[1],
);
const newEdition = JSON.parse(
  /const EDITION = ("[^"]+");/.exec(await readFile("dist/sw.js", "utf8"))[1],
);
const rows = [];
for (const [name, engine] of Object.entries({ chromium, firefox })) {
  const server = await auditServer(oldDirectory);
  server.cacheControl("max-age=600");
  const browser = await engine.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  try {
    const page = await context.newPage();
    await page.goto(server.base);
    await page.waitForFunction(
      () =>
        navigator.serviceWorker.controller &&
        document.querySelector("#offline").textContent.startsWith("Ready offline"),
    );
    server.useDirectory(path.resolve("dist"));
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration()).update();
    });
    await page.waitForFunction(
      async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
      null,
      { timeout: 60000 },
    );
    for (let i = 0; i < 3; i++) await page.locator("#pump").click();
    assert.equal(await page.locator("#pressure").textContent(), "854");
    const downloading = page.waitForEvent("download");
    await page.locator("#study").click();
    await (await downloading).saveAs(path.join(output, `${name}-old.html`));
    const supervisor = await context.newPage();
    await supervisor.goto(server.supervisor);
    await supervisor.evaluate(async (base) => {
      window.pendingEdition = (await navigator.serviceWorker.getRegistration(base)).waiting;
      if (!window.pendingEdition) throw new Error("No expected waiting worker");
    }, server.base);
    await page.close();
    await supervisor.waitForFunction(() => window.pendingEdition.state === "activated", null, {
      timeout: 60000,
    });
    const next = await context.newPage();
    await next.goto(server.base);
    await next.waitForFunction(
      () => document.querySelector("#offline").textContent.startsWith("Ready offline"),
      null,
      { timeout: 30000 },
    );
    const state = await next.evaluate(async () => ({
      status: document.querySelector("#offline").textContent,
      controller: navigator.serviceWorker.controller?.scriptURL,
      caches: await caches.keys(),
      scripts: [...document.scripts].map((s) => s.src),
    }));
    assert.deepEqual(
      state.caches.filter((c) => c.startsWith("pnigeus-")),
      [`pnigeus-${newEdition}`],
    );
    await server.stop();
    await context.setOffline(true);
    await next.reload();
    await next.waitForFunction(() =>
      document.querySelector("#offline").textContent.startsWith("Ready offline"),
    );
    await next.getByRole("link", { name: "Pump timing", exact: true }).click();
    await next.locator("#timing-pipes").selectOption("1");
    await next.locator("#timing-rule").selectOption("at-most");
    await next.locator("#timing-search").click();
    await next.locator("#timing-load-best").click();
    assert.equal(await next.locator("#timing-within").textContent(), "12.000");
    rows.push({
      name,
      oldEdition,
      newEdition,
      cacheControl: "max-age=600",
      oldVerifiedExport: true,
      newOfflineTiming: true,
      state,
    });
    console.log(
      `${name}: archived legacy edition, warm HTTP cache, waiting activation, new offline timing passed`,
    );
  } catch (error) {
    const pages = [];
    for (const p of context.pages())
      try {
        pages.push({
          url: p.url(),
          state: await p.evaluate(async () => ({
            status: document.querySelector("#offline")?.textContent,
            controller: navigator.serviceWorker.controller?.scriptURL,
            caches: await caches.keys(),
            scripts: [...document.scripts].map((s) => s.src),
          })),
        });
      } catch {}
    await writeFile(
      path.join(output, `${name}-failure.json`),
      JSON.stringify({ pages, requests: server.requests }, null, 2),
    );
    throw error;
  } finally {
    await browser.close();
    await server.close();
  }
}
await writeFile(
  path.join(output, "review.json"),
  `${JSON.stringify({ boundary: "local replay of the actual archived legacy Pages build; shared ten-minute HTTP caching; not an actual public deployment", rows }, null, 2)}\n`,
);
