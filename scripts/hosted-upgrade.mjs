import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, firefox } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(process.argv[2] ?? "/tmp/pnigeus-review/hosted-upgrade.json");
const expectedOld = process.argv[3];
if (!/^[a-f0-9]{64}$/.test(expectedOld ?? ""))
  throw new Error(
    "Supply the old edition digest as the second argument. This reviewer holds two browsers open across a deployment; send Enter on stdin only after the new hosted bytes have been verified.",
  );
await mkdir(path.dirname(output), { recursive: true });
const base = "https://antonsoo.github.io/pnigeus/";
async function inspect(page) {
  return page.evaluate(async () => {
    const worker = navigator.serviceWorker.controller;
    if (!worker) throw new Error("No controlling worker");
    const channel = new MessageChannel();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Worker inspection timed out")), 8000);
      channel.port1.onmessage = (e) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(e.data);
      };
      worker.postMessage({ type: "PNIGEUS_INSPECT" }, [channel.port2]);
    });
  });
}
const fixtures = [];
const receipt = {
  startedAt: new Date().toISOString(),
  base,
  expectedOld,
  scope:
    "Actual public origin, existing browser tabs and service-worker controller transition across deployment. Offline checks disable browser networking; the public origin remains running.",
  workflows: [],
};
try {
  for (const [name, engine] of Object.entries({ chromium, firefox })) {
    const browser = await engine.launch();
    const context = await browser.newContext({
      viewport: { width: 375, height: 1040 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    fixtures.push({ name, browser, context, page, errors });
    await page.goto(base);
    await page
      .locator("#offline")
      .filter({ hasText: /^Ready offline/ })
      .waitFor({ timeout: 30000 });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const old = await inspect(page);
    assert.equal(old.edition, expectedOld);
    assert.equal(old.complete, true);
    console.log(
      `${name}: actual public old edition is loaded and controlled (${old.edition.slice(0, 12)}).`,
    );
  }
  console.log(
    "Both old tabs are held open. After verifying the new public build, send Enter to continue.",
  );
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once("data", resolve));
  process.stdin.pause();
  const sw = await readFile(path.join(root, "dist/sw.js"), "utf8");
  const expectedNew = JSON.parse(/const EDITION = ("[^"]+");/.exec(sw)[1]);
  const expectedFiles = JSON.parse(/const FILES = (\[[^\n]+\]);/.exec(sw)[1]);
  assert.notEqual(expectedNew, expectedOld);
  receipt.expectedNew = expectedNew;
  for (const { name, browser, context, page, errors } of fixtures) {
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration()).update();
    });
    await page.waitForFunction(
      async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state === "installed",
      null,
      { timeout: 90000 },
    );
    const unchanged = await inspect(page);
    assert.equal(unchanged.edition, expectedOld);
    assert.equal(unchanged.complete, true);
    // The old build remains usable; do not navigate its legacy network-first HTML.
    for (let i = 0; i < 3; i++) await page.locator("#pump").click();
    assert.equal(await page.locator("#pressure").textContent(), "854");
    const oldDownload = page.waitForEvent("download");
    await page.locator("#study").click();
    await (await oldDownload).saveAs(path.join(path.dirname(output), `${name}-old-reading.html`));
    await page.close();
    // Wait outside the controlled scope, allowing default activation.
    const supervisor = await context.newPage();
    await supervisor.goto("https://antonsoo.github.io/");
    await supervisor.waitForFunction(
      async () => {
        const registration = await navigator.serviceWorker.getRegistration("/pnigeus/");
        return registration?.active?.state === "activated" && !registration.waiting;
      },
      null,
      { timeout: 30000 },
    );
    const next = await context.newPage();
    next.on("pageerror", (e) => errors.push(e.message));
    await next.goto(base);
    await supervisor.close();
    fixtures.find((f) => f.name === name).page = next;
    await next
      .locator("#offline")
      .filter({ hasText: /^Ready offline/ })
      .waitFor({ timeout: 30000 });
    await next.getByRole("link", { name: "Shape study", exact: true }).waitFor();
    const current = await inspect(next);
    assert.equal(current.edition, expectedNew);
    assert.equal(current.complete, true);
    const inventory = await next.evaluate(async (edition) => {
      const names = (await caches.keys()).filter((name) => name.startsWith("pnigeus-"));
      const keys = await (await caches.open(`pnigeus-${edition}`)).keys();
      return { names, paths: keys.map((r) => new URL(r.url).pathname).sort() };
    }, expectedNew);
    assert.deepEqual(inventory.names, [`pnigeus-${expectedNew}`]);
    assert.deepEqual(inventory.paths, [...expectedFiles].sort());
    await context.setOffline(true);
    await next.reload();
    await next
      .locator("#offline")
      .filter({ hasText: /^Ready offline/ })
      .waitFor();
    await next.getByRole("link", { name: "Shape study", exact: true }).click();
    assert.equal(await next.locator("#shape-pressure").textContent(), "4481");
    await next.locator("#half-radius").click();
    assert.equal(await next.locator("#radius").inputValue(), "20");
    const pending = next.waitForEvent("download");
    await next.locator("#shape-reading").click();
    const reading = path.join(path.dirname(output), `${name}-upgraded-reading.html`);
    await (await pending).saveAs(reading);
    const native = await context.newPage();
    await native.goto(pathToFileURL(reading).href);
    await native.evaluate(() => document.fonts.ready);
    assert.equal(
      await native.locator("img").evaluate((img) => img.complete && img.naturalWidth === 1650),
      true,
    );
    await native.close();
    await next.getByRole("link", { name: "Return to the pump and listening workshop" }).click();
    for (let i = 0; i < 3; i++) await next.locator("#pump").click();
    assert.equal(await next.locator("#pressure").textContent(), "854");
    assert.deepEqual(errors, []);
    receipt.workflows.push({
      engine: name,
      version: browser.version(),
      width: 375,
      oldEdition: expectedOld,
      newEdition: expectedNew,
      newWorkerWaitedForOldTab: true,
      reloadedNewPageReady: true,
      cachedFiles: inventory.paths,
      obsoleteEditionCaches: 0,
      offlineBothWorkshops: true,
      offlineGreekReadingOpened: true,
      pageErrors: errors,
    });
    console.log(
      `${name}: waiting update, preserved old export, complete new cache and offline studies passed.`,
    );
  }
  receipt.completedAt = new Date().toISOString();
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`Review receipt: ${output}`);
} finally {
  for (const { context, browser } of fixtures) {
    await context.close();
    await browser.close();
  }
}
