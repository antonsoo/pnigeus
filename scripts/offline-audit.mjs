import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";
import { auditServer } from "./audit-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(process.argv[2] ?? "/tmp/claude-1000/pnigeus-audit/offline");
const next = path.resolve(process.argv[3]);
await mkdir(output, { recursive: true });
const edition = JSON.parse(
  /const EDITION = ("[^"]+");/.exec(await readFile(path.join(root, "dist/sw.js"), "utf8"))[1],
);
const nextEdition = JSON.parse(
  /const EDITION = ("[^"]+");/.exec(await readFile(path.join(next, "sw.js"), "utf8"))[1],
);
assert.notEqual(edition, nextEdition);
const receipt = {
  boundary: "local real-origin audit; changed-source edition C is a synthetic fixture",
  edition,
  nextEdition,
  workflows: [],
};
const ready = (page) =>
  page.waitForFunction(
    () =>
      Boolean(navigator.serviceWorker.controller) &&
      document.querySelector("#offline")?.textContent.startsWith("Ready offline"),
    undefined,
    { timeout: 120000 },
  );
async function state(page) {
  return page.evaluate(() => ({
    query: location.search,
    strokes: [...document.querySelectorAll("[data-slot]")].map((e) => e.value),
    note: document.querySelector("#timing-note").value,
    kept: document.querySelector("#timing-kept").textContent,
  }));
}
async function download(page, name) {
  const promise = page.waitForEvent("download", { timeout: 120000 });
  await page.locator("#timing-reading").click();
  const file = path.join(output, name);
  await (await promise).saveAs(file);
  return file;
}
async function inspection(page, base) {
  return page.evaluate(async (base) => {
    const active = (await navigator.serviceWorker.getRegistration(base))?.active;
    if (!active) return null;
    const channel = new MessageChannel();
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 10000);
      channel.port1.onmessage = (e) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(e.data);
      };
      active.postMessage({ type: "PNIGEUS_INSPECT" }, [channel.port2]);
    });
  }, base);
}

for (const [engine, launcher] of [
  ["chromium", chromium],
  ["firefox", firefox],
].filter(([engine]) => !process.env.AUDIT_BROWSER || process.env.AUDIT_BROWSER === engine)) {
  const site = await auditServer(path.join(root, "dist"));
  const browser = await launcher.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 1000 },
    acceptDownloads: true,
  });
  const row = { engine };
  try {
    const a = await context.newPage();
    await a.goto(`${site.base}timing.html?strokes=0.1.2.1.1.2`);
    await ready(a);
    await a.locator("#timing-keep").click();
    await a.locator("#timing-note").fill("Keep this argument through loss and repair.");
    const b = await context.newPage();
    await b.goto(`${site.base}timing.html?strokes=7.0.0.0.0.0`);
    await ready(b);
    await b.locator("#timing-note").fill("A different tab keeps a different argument.");
    const original = [await state(a), await state(b)];
    const supervisor = await context.newPage();
    await supervisor.goto(site.supervisor);

    // A real wrong-byte network Response preserves URL/type/length metadata.
    site.fault("sources/hero-fig76.jpg", { wrong: true });
    await supervisor.evaluate(async (base) => {
      const key = (await caches.keys()).find((key) => key.startsWith("pnigeus-"));
      const url = `${base}sources/hero-fig76.jpg`;
      const wrong = await fetch(url, { cache: "no-store" });
      await (await caches.open("audit-bad-response")).put(url, wrong.clone());
      await (await caches.open(key)).put(url, wrong);
      await (await caches.open(key)).delete(`${base}sources/hero-schmidt-192.jpg`);
    }, site.base);
    site.fault("sources/hero-fig76.jpg", null);
    await a.locator("#offline-check").click();
    await a.locator("#offline-repair").waitFor();
    await b.locator("#offline-repair").waitFor();
    assert.ok(!(await a.locator("#offline").textContent()).startsWith("Ready offline"));
    assert.ok(!(await b.locator("#offline").textContent()).startsWith("Ready offline"));
    site.resetRequests();
    await a.locator("#offline-repair").click();
    await ready(a);
    await ready(b);
    const repaired = site.requests.filter((r) => !r.file.endsWith("sw.js")).map((r) => r.file);
    assert.deepEqual([...new Set(repaired)].sort(), [
      "sources/hero-fig76.jpg",
      "sources/hero-schmidt-192.jpg",
    ]);
    assert.deepEqual([await state(a), await state(b)], original);
    row.sameLengthCorruptionAndMissingSource = true;
    row.onlyDamagedFilesFetched = repaired;

    await site.stop();
    await context.setOffline(true);
    await a.reload();
    await ready(a);
    await download(a, `${engine}-repaired-offline.html`);
    // Put the preserved, wrong-byte network response back while the origin is down.
    await a.evaluate(async (base) => {
      const key = (await caches.keys()).find((key) => key.startsWith("pnigeus-"));
      const url = `${base}sources/hero-fig76.jpg`;
      await (await caches.open(key)).put(
        url,
        await (await caches.open("audit-bad-response")).match(url),
      );
    }, site.base);
    await a.locator("#offline-check").click();
    await a.locator("#offline-repair").waitFor();
    await b.locator("#offline-repair").waitFor();
    await a.locator("#timing-reading").click();
    await a.waitForFunction(() =>
      document.querySelector("#timing-export-status").textContent.includes("could not be loaded"),
    );
    assert.equal(await a.locator("#offline-repair").isDisabled(), true);
    row.offlineCorruptionRefusedAndOtherTabInvalidated = true;

    // Total eviction must not leave a stale ready claim or recreate an empty cache.
    await b.evaluate(async () => {
      for (const key of await caches.keys())
        if (key.startsWith("pnigeus-")) await caches.delete(key);
    });
    await b.locator("#offline-check").click();
    await b.waitForFunction(() =>
      document.querySelector("#offline").textContent.startsWith("0 of"),
    );
    assert.deepEqual(
      await b.evaluate(async () =>
        (await caches.keys()).filter((key) => key.startsWith("pnigeus-")),
      ),
      [],
    );
    await site.start();
    await context.setOffline(false);
    await b.waitForFunction(() => !document.querySelector("#offline-repair").disabled);
    await b.locator("#offline-repair").click();
    await ready(a);
    await ready(b);
    assert.deepEqual(await state(b), original[1]);
    row.totalEvictionRepairedWithoutChangingOtherTab = true;

    // Healthy source transfer continues beyond the old fixed-time assumptions.
    await a.evaluate(async (base) => {
      const key = (await caches.keys()).find((key) => key.startsWith("pnigeus-"));
      await (await caches.open(key)).delete(`${base}fonts/NotoSerif-Regular.ttf`);
    }, site.base);
    await a.locator("#offline-check").click();
    await a.locator("#offline-repair").waitFor();
    site.limit(16 * 1024);
    const start = Date.now();
    await a.locator("#offline-repair").click();
    await ready(a);
    row.activeSlowRepairMilliseconds = Date.now() - start;
    assert.ok(row.activeSlowRepairMilliseconds > 20000);
    site.limit(0);

    // A changed source byte belongs to a different edition; open tabs keep B.
    site.useDirectory(next);
    await a.evaluate(async (base) => {
      await (await navigator.serviceWorker.getRegistration(base)).update();
    }, site.base);
    await a.locator("#offline-update").waitFor();
    await a.waitForFunction(() => document.querySelector("#offline-update").hidden === false);
    assert.equal((await inspection(supervisor, site.base)).edition, edition);
    const oldExport = await download(b, `${engine}-old-edition-while-update-waits.html`);
    assert.ok(!(await readFile(oldExport, "utf8")).includes("Synthetic audit edition C marker"));
    const freshTab = await context.newPage();
    await freshTab.goto(`${site.base}timing.html`);
    await ready(freshTab);
    assert.equal((await inspection(freshTab, site.base)).edition, edition);
    await freshTab.close();
    await a.close();
    await b.close();
    await supervisor.waitForFunction(async (base) => {
      const reg = await navigator.serviceWorker.getRegistration(base);
      return reg?.active?.state === "activated" && !reg.waiting;
    }, site.base);
    const current = await context.newPage();
    await current.goto(`${site.base}timing.html?strokes=0.1.2.1.1.2`);
    await ready(current);
    assert.equal((await inspection(current, site.base)).edition, nextEdition);
    const updated = await download(current, `${engine}-new-edition.html`);
    assert.ok((await readFile(updated, "utf8")).includes("Synthetic audit edition C marker"));
    const keys = await current.evaluate(async () =>
      (await caches.keys()).filter((key) => key.startsWith("pnigeus-")),
    );
    assert.equal(keys.length, 1);
    assert.ok(keys[0].endsWith(nextEdition));
    row.waitingUpdatePreservesOldTabsAndVerifiedExport = true;
    row.newEditionActivatesAfterOldTabsClose = true;
    row.oldCacheRemovedAfterActivation = true;
    await site.stop();
    await context.setOffline(true);
    await current.reload();
    await ready(current);
    await download(current, `${engine}-new-edition-offline.html`);
    row.offlineAfterChangedSourceUpdate = true;
    receipt.workflows.push(row);
    console.log(
      `${engine}: corruption, cross-tab invalidation, eviction, slow repair, waiting update and changed-source offline export passed`,
    );
  } catch (error) {
    const pages = [];
    for (const page of context.pages()) {
      try {
        pages.push({
          url: page.url(),
          state: await page.evaluate(async () => ({
            status: document.querySelector("#offline")?.textContent,
            repair: document.querySelector("#offline-repair")?.outerHTML,
            update: document.querySelector("#offline-update")?.textContent,
            caches: await caches.keys(),
          })),
          inspection: await inspection(page, site.base),
        });
      } catch {}
    }
    await writeFile(
      path.join(output, `${engine}-failure.json`),
      JSON.stringify({ row, pages, requests: site.requests }, null, 2),
    );
    throw error;
  } finally {
    await browser.close();
    await site.close();
  }
}
await writeFile(path.join(output, "review.json"), `${JSON.stringify(receipt, null, 2)}\n`);
