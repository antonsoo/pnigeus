import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, firefox } from "playwright";
import { auditServer } from "./audit-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(process.argv[2] ?? "/tmp/claude-1000/pnigeus-audit/transfers");
await mkdir(output, { recursive: true });
const receipt = { boundary: "local, real response bodies; no browser route stubs", browsers: [] };

for (const [engine, launcher] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const site = await auditServer(path.join(root, "dist"));
  const browser = await launcher.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: true });
    const page = await context.newPage();
    await page.goto(`${site.base}timing.html`);
    await page.locator("#timing-note").fill("Snapshot before a healthy slow transfer.");
    site.fault("sources/hero-fig76.jpg", { stall: true });
    const stalledAt = Date.now();
    await page.locator("#timing-reading").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#timing-export-status").textContent.includes("stopped arriving"),
      undefined,
      { timeout: 25000 },
    );
    const stalledMilliseconds = Date.now() - stalledAt;
    assert.ok(stalledMilliseconds >= 14000 && stalledMilliseconds < 25000);
    assert.equal(await page.locator("#timing-reading").isEnabled(), true);
    site.fault("sources/hero-fig76.jpg", null);

    site.limit(16 * 1024);
    const pending = page.waitForEvent("download", { timeout: 120000 });
    const start = Date.now();
    await page.locator("#timing-reading").click();
    await page.waitForTimeout(20000);
    assert.equal(await page.locator("#timing-reading").isDisabled(), true);
    await page.locator('[data-timing-preset="late"]').click();
    await page.locator("#timing-note").fill("Edited while verified assets arrive.");
    const file = path.join(output, `${engine}-healthy-active.html`);
    await (await pending).saveAs(file);
    const activeMilliseconds = Date.now() - start;
    assert.ok(activeMilliseconds > 20000);
    const html = await readFile(file, "utf8");
    assert.ok(html.includes("Snapshot before a healthy slow transfer."));
    assert.ok(!html.includes("Edited while verified assets arrive."));
    site.limit(0);

    // A bad source cancels its sibling's hanging font request as one operation.
    site.fault("sources/hero-fig76.jpg", { wrong: true });
    site.fault("fonts/NotoSerif-Regular.ttf", { stall: true });
    await page.locator("#timing-reading").click();
    await page.waitForFunction(() =>
      document.querySelector("#timing-export-status").textContent.includes("did not match"),
    );
    await page.waitForTimeout(300);
    assert.equal(site.activeStreams, 0);
    site.fault("sources/hero-fig76.jpg", null);
    site.fault("fonts/NotoSerif-Regular.ttf", null);

    const cancellations = [];
    for (const [route, save, cancel, status, source] of [
      ["", "#study", "#study-cancel", "#export-status", "sources/hero-fig76.jpg"],
      [
        "shapes.html",
        "#shape-reading",
        "#shape-cancel",
        "#shape-export-status",
        "sources/hero-schmidt-192.jpg",
      ],
      [
        "timing.html",
        "#timing-reading",
        "#timing-cancel",
        "#timing-export-status",
        "sources/hero-fig76.jpg",
      ],
    ]) {
      await page.goto(`${site.base}${route}`);
      site.fault(source, { stall: true });
      await page.locator(save).click();
      await page.locator(cancel).click();
      await page.waitForFunction(
        (status) => document.querySelector(status).textContent.includes("cancelled"),
        status,
      );
      assert.equal(await page.locator(save).isEnabled(), true);
      site.fault(source, null);
      const retry = page.waitForEvent("download");
      await page.locator(save).click();
      await (await retry).saveAs(path.join(output, `${engine}-${route || "pump"}-retry.html`));
      cancellations.push(route || "pump");
    }
    await context.close();

    // Shared server bandwidth includes the install and simultaneous foreground export.
    site.limit(64 * 1024);
    const cold = await browser.newContext({
      viewport: { width: 375, height: 1000 },
      acceptDownloads: true,
    });
    const p = await cold.newPage();
    const samples = [];
    const coldStart = Date.now();
    await p.goto(`${site.base}timing.html`, { waitUntil: "domcontentloaded" });
    await p.locator("#timing-reading").waitFor();
    const foreground = p.waitForEvent("download", { timeout: 180000 });
    await p.locator("#timing-reading").click();
    while (true) {
      const sample = await p.evaluate(() => ({
        status: document.querySelector("#offline").textContent,
        controller: Boolean(navigator.serviceWorker.controller),
      }));
      samples.push({ milliseconds: Date.now() - coldStart, ...sample });
      if (sample.status.startsWith("Ready offline")) {
        assert.equal(sample.controller, true);
        break;
      }
      assert.ok(Date.now() - coldStart < 180000, "Cold install stalled");
      await p.waitForTimeout(1000);
    }
    await (await foreground).saveAs(path.join(output, `${engine}-cold-foreground.html`));
    const sw = await readFile("dist/sw.js", "utf8");
    const expected = JSON.parse(/const INVENTORY = (\{[^\n]+\});/.exec(sw)[1]);
    const independentlyVerified = await p.evaluate(async (expected) => {
      const names = (await caches.keys()).filter((n) => n.startsWith("pnigeus-"));
      if (names.length !== 1) throw new Error("Unexpected cache count");
      const cache = await caches.open(names[0]);
      for (const [url, identity] of Object.entries(expected)) {
        const response = await cache.match(url);
        if (!response) throw new Error(`Missing ${url}`);
        const bytes = await response.arrayBuffer();
        const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (hash !== identity.sha256 || bytes.byteLength !== identity.bytes)
          throw new Error(`Wrong cached bytes: ${url}`);
      }
      return Object.keys(expected).length;
    }, expected);
    const coldMilliseconds = Date.now() - coldStart;
    assert.ok(coldMilliseconds > 15000);
    site.limit(0);
    await site.stop();
    await cold.setOffline(true);
    await p.reload();
    await p.waitForFunction(
      () =>
        navigator.serviceWorker.controller &&
        document.querySelector("#offline")?.textContent.startsWith("Ready offline"),
    );
    const offline = p.waitForEvent("download");
    await p.locator("#timing-reading").click();
    await (await offline).saveAs(path.join(output, `${engine}-cold-then-offline.html`));
    await cold.close();
    receipt.browsers.push({
      engine,
      stalledMilliseconds,
      activeMilliseconds,
      currentStateSnapshotPreserved: true,
      siblingRequestAbortedOnFailure: true,
      cancellationAndRetryRooms: cancellations,
      coldSharedBandwidth: 64 * 1024,
      coldMilliseconds,
      independentlyVerifiedCacheFiles: independentlyVerified,
      readinessSamples: samples,
      foregroundDuringInstallAndStoppedOriginExport: true,
    });
    console.log(
      `${engine}: active slow export, idle refusal, group cancellation, all-room retry and cold shared-bandwidth install passed`,
    );
  } finally {
    await browser.close();
    await site.close();
  }
}
await writeFile(path.join(output, "review.json"), `${JSON.stringify(receipt, null, 2)}\n`);
