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
    await page.locator("#offline").filter({ hasText: "Ready offline" }).waitFor({ timeout: 30000 });
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
    // The old page must reject readiness from a new edition until reloaded.
    await page.locator("#offline").filter({ hasText: "not ready" }).waitFor({ timeout: 30000 });
    const changed = await inspect(page);
    assert.equal(changed.edition, expectedNew);
    assert.equal(changed.complete, true);
    await page.reload();
    await page.locator("#offline").filter({ hasText: "Ready offline" }).waitFor({ timeout: 30000 });
    await page.getByRole("link", { name: "Shape study", exact: true }).waitFor();
    const current = await inspect(page);
    assert.equal(current.edition, expectedNew);
    assert.equal(current.complete, true);
    const inventory = await page.evaluate(async (edition) => {
      const names = (await caches.keys()).filter((name) => name.startsWith("pnigeus-"));
      const keys = await (await caches.open(`pnigeus-${edition}`)).keys();
      return { names, paths: keys.map((r) => new URL(r.url).pathname).sort() };
    }, expectedNew);
    assert.deepEqual(inventory.names, [`pnigeus-${expectedNew}`]);
    assert.deepEqual(inventory.paths, [...expectedFiles].sort());
    await context.setOffline(true);
    await page.reload();
    await page.locator("#offline").filter({ hasText: "Ready offline" }).waitFor();
    await page.getByRole("link", { name: "Shape study", exact: true }).click();
    assert.equal(await page.locator("#shape-pressure").textContent(), "4481");
    await page.locator("#half-radius").click();
    assert.equal(await page.locator("#radius").inputValue(), "20");
    const pending = page.waitForEvent("download");
    await page.locator("#shape-reading").click();
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
    await page.getByRole("link", { name: "Return to the pump and listening workshop" }).click();
    for (let i = 0; i < 3; i++) await page.locator("#pump").click();
    assert.equal(await page.locator("#pressure").textContent(), "854");
    assert.deepEqual(errors, []);
    receipt.workflows.push({
      engine: name,
      version: browser.version(),
      width: 375,
      oldEdition: expectedOld,
      newEdition: expectedNew,
      oldPageRejectedNewWorkerReadiness: true,
      reloadedNewPageReady: true,
      cachedFiles: inventory.paths,
      obsoleteEditionCaches: 0,
      offlineBothWorkshops: true,
      offlineGreekReadingOpened: true,
      pageErrors: errors,
    });
    console.log(
      `${name}: real controller upgrade, honest old-page status, complete new cache and offline studies passed.`,
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
