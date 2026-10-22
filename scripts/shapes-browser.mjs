import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(process.argv[2] ?? "/tmp/pnigeus-review/shapes.json");
const external = process.argv[3] ? new URL(process.argv[3]) : null;
const development = process.argv[4] === "development";
if (
  external &&
  (!external.pathname.endsWith("/") ||
    (external.protocol !== "https:" &&
      !(
        development &&
        external.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(external.hostname)
      )))
)
  throw new Error("Supply an HTTPS base URL, or an explicit local development URL, ending in /.");
const directory = path.dirname(output);
await mkdir(directory, { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
};
async function serve() {
  if (external) return { url: external.href, close: async () => {} };
  const app = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://local");
      if (!url.pathname.startsWith("/pnigeus/")) {
        res.writeHead(404).end();
        return;
      }
      const relative = decodeURIComponent(url.pathname.slice(9)) || "index.html";
      const target = path.resolve(root, "dist", relative);
      if (!target.startsWith(path.join(root, "dist") + path.sep)) throw new Error("Invalid path");
      res.writeHead(200, {
        "Content-Type": mime[path.extname(target)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(await readFile(target));
    } catch {
      if (!res.headersSent) res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${app.address().port}/pnigeus/`,
    close: () =>
      new Promise((resolve) => {
        app.close(resolve);
        app.closeAllConnections();
      }),
  };
}
async function files(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory())
      result.push(...(await files(path.join(directory, entry.name), relative)));
    else
      result.push({
        file: relative,
        sha256: createHash("sha256")
          .update(await readFile(path.join(directory, entry.name)))
          .digest("hex"),
      });
  }
  return result.sort((a, b) => a.file.localeCompare(b.file));
}
async function download(page, selector, filename) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const file = path.join(directory, filename);
  await (await pending).saveAs(file);
  return file;
}
async function observation(page, label, id) {
  const csv = await download(page, "#shape-csv", `${id}-${label}.csv`);
  const u = new URL(page.url());
  const p = u.searchParams;
  const settings = {
    radiusCm: Number(p.get("r") ?? 40),
    fill: p.get("fill") ?? "roof",
    plan: p.get("plan") ?? "octagon",
    drop: Number(p.get("drop") ?? 30),
    form: p.get("form") ?? "hemisphere",
    phase: p.get("phase") ?? "after",
  };
  const drawing = await page.locator(".shape-section").evaluate((svg) => {
    const start = (d) => /^M([-\d.]+) ([-\d.]+)/.exec(d);
    const inside = svg.querySelector('[data-surface="inside"]').getAttribute("d");
    const outside = svg.querySelector('[data-surface="outside"]').getAttribute("d");
    return {
      inside: Number(svg.dataset.inside),
      outside: Number(svg.dataset.outside),
      pressure: Number(svg.dataset.pressure),
      stock: Number(svg.dataset.stock),
      zero: Number(svg.dataset.zero),
      scale: Number(svg.dataset.scale),
      insideY: Number(start(inside)[2]),
      outsideY: Number(start(outside)[2]),
      insideStart: Number(start(inside)[1]),
      insideEnd: Number(/H([-\d.]+)/.exec(inside)[1]),
      profile: svg.querySelector(".section-bronze").getAttribute("d"),
    };
  });
  const plot = await page.locator(".reserve-plot").evaluate((svg) => ({
    stockAxis: Number(svg.dataset.stockAxis),
    headAxis: Number(svg.dataset.headAxis),
    left: Number(svg.dataset.left),
    right: Number(svg.dataset.right),
    top: Number(svg.dataset.top),
    bottom: Number(svg.dataset.bottom),
    paths: Object.fromEntries(
      [...svg.querySelectorAll("[data-form]")].map((p) => [
        p.dataset.form,
        [...p.getAttribute("d").matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map((m) => [
          Number(m[1]),
          Number(m[2]),
        ]),
      ]),
    ),
  }));
  const plan = await page.locator(".tank-plan").evaluate((svg) => ({
    rimRadius: Number(svg.querySelector(":scope > circle").getAttribute("r")),
    outerCircle: svg.querySelector("g circle")
      ? Number(svg.querySelector("g circle").getAttribute("r"))
      : null,
    polygon:
      svg
        .querySelector("polygon")
        ?.getAttribute("points")
        .split(" ")
        .map((p) => p.split(",").map(Number)) ?? null,
  }));
  const text = await readFile(csv, "utf8");
  const rows = text.trim().split(/\r?\n/);
  const keys = rows.shift().split(",");
  const parsed = rows.map((row) => Object.fromEntries(row.split(",").map((v, i) => [keys[i], v])));
  assert.equal(parsed.length, 249);
  for (const row of await page.locator("[data-form-row]").all()) {
    const form = await row.getAttribute("data-form-row");
    const full = parsed.find((r) => r.form === form && r.kind === "full");
    const after = parsed.find((r) => r.form === form && r.kind === "endpoint");
    for (const [metric, value] of [
      ["full-volume", Number(full.actual_air_litres)],
      ["full-head", 1000 * Number(full.head_m)],
      ["delivered", Number(after.delivered_ambient_litres)],
      ["space-lost", Number(after.geometric_release_litres)],
    ]) {
      assert.equal(
        (await row.locator(`[data-metric="${metric}"]`).textContent()).replace("*", ""),
        value.toFixed(2),
      );
    }
  }
  const selected = parsed.find(
    (r) => r.form === settings.form && r.kind === (settings.phase === "full" ? "full" : "endpoint"),
  );
  assert.equal(
    await page.locator("#shape-volume").textContent(),
    Number(selected.actual_air_litres).toFixed(2),
  );
  assert.equal(
    await page.locator("#shape-pressure").textContent(),
    Number(selected.actual_air_litres) < 1e-9 ? "Empty" : Number(selected.gauge_pa).toFixed(0),
  );
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  return { label, settings, csv, drawing, plot, plan };
}
const receipt = {
  reviewedAt: new Date().toISOString(),
  mode: development ? "development" : external ? "hosted" : "local",
  ...(external ? { url: external.href } : {}),
  build: development ? [] : await files(path.join(root, "dist")),
  workflows: [],
  negativeCases: [],
};
for (const [name, engine] of Object.entries({ chromium, firefox })) {
  const browser = await engine.launch({
    headless: true,
    ...(name === "chromium" ? { args: ["--disable-dev-shm-usage"] } : {}),
  });
  try {
    for (const width of [1440, 375]) {
      const id = `${name}-${width}`;
      const site = await serve();
      const context = await browser.newContext({
        viewport: { width, height: 1040 },
        acceptDownloads: true,
      });
      const page = await context.newPage();
      const errors = [];
      const externalRequests = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("request", (r) => {
        if (/^https?:/.test(r.url()) && !r.url().startsWith(site.url))
          externalRequests.push(r.url());
      });
      const workflow = {
        engine: name,
        version: browser.version(),
        width,
        observations: [],
        screenshots: [],
      };
      try {
        await page.goto(`${site.url}shapes.html`);
        await page.evaluate(() => document.fonts.ready);
        if (!development)
          await page
            .locator("#offline")
            .filter({ hasText: "Ready offline" })
            .waitFor({ timeout: 20000 });
        assert.equal(
          await page.locator("body").evaluate((e) => getComputedStyle(e).fontFamily),
          "Workshop, sans-serif",
        );
        assert.equal(
          await page.locator(".section-bronze").evaluate((e) => getComputedStyle(e).stroke),
          "rgb(147, 100, 21)",
        );
        assert.equal(await page.locator("#shape-pressure").textContent(), "4481");
        workflow.observations.push(await observation(page, "published-endpoint", id));
        await page.locator("#shape-workshop").evaluate((e) => e.scrollIntoView({ block: "start" }));
        const shot = path.join(directory, `${id}-workshop.png`);
        await page.screenshot({ path: shot });
        workflow.screenshots.push(shot);
        await page.locator('[data-phase="full"]').focus();
        await page.keyboard.press("Enter");
        assert.equal(
          await page.locator('[data-phase="full"]').evaluate((e) => e === document.activeElement),
          true,
        );
        assert.equal(await page.locator("#shape-pressure").textContent(), "6402");
        workflow.observations.push(await observation(page, "full", id));
        await page.locator('[data-phase="after"]').click();
        await page.locator('.form-selector [data-form-choice="cone"]').focus();
        await page.keyboard.press("Enter");
        assert.equal(
          await page
            .locator('.form-selector [data-form-choice="cone"]')
            .evaluate((e) => e === document.activeElement),
          true,
        );
        workflow.observations.push(await observation(page, "cone", id));
        const before = page.url();
        await page.locator("#half-radius").click();
        assert.equal(await page.locator("#radius").inputValue(), "20");
        workflow.observations.push(await observation(page, "half-size", id));
        await page.goBack();
        assert.equal(page.url(), before);
        assert.equal(await page.locator("#radius").inputValue(), "40");
        await page.locator("#fill").selectOption("half");
        await page.locator("#plan").selectOption("wide");
        workflow.observations.push(await observation(page, "shallow-wide", id));
        await page.locator('.form-selector [data-form-choice="cylinder"]').click();
        await page.locator("#radius").focus();
        await page.keyboard.press("End");
        assert.equal(await page.locator("#radius").inputValue(), "50");
        await page.keyboard.press("ArrowLeft");
        assert.equal(await page.locator("#radius").inputValue(), "45");
        await page.locator("#plan").selectOption("double");
        workflow.observations.push(await observation(page, "cylinder-keyboard", id));
        await page.locator("#fill").selectOption("extra");
        await page.locator("#drop").selectOption("90");
        await page.locator('.form-selector [data-form-choice="hemisphere"]').click();
        assert.equal(await page.locator("#shape-pressure").textContent(), "Empty");
        assert.match(await page.locator("#shape-status").textContent(), /empties before/);
        workflow.observations.push(await observation(page, "empty-limit", id));
        await page.locator(".shape-table").focus();
        await page.keyboard.press("ArrowRight");
        if (width === 375)
          await page.waitForFunction(() => document.querySelector(".shape-table").scrollLeft > 0);
        await page.locator('[data-greek="water"]').focus();
        await page.keyboard.press("Enter");
        assert.match(await page.locator("#greek-note").textContent(), /dative singular/);
        await page.locator('[data-greek="inverted"]').click();
        assert.match(
          await page.locator("#greek-note").textContent(),
          /perfect middle\/passive participle/,
        );
        await page.locator("#source-full").click();
        assert.equal(await page.locator(".greek-scan").getAttribute("viewBox"), "0 0 1650 2473");
        await page.locator("#source-detail").click();
        assert.equal(
          await page.locator("#greek-scan image").evaluate(async (image) => {
            const img = new Image();
            img.src = image.getAttribute("href");
            await img.decode();
            return img.naturalWidth === 1650 && img.naturalHeight === 2473;
          }),
          true,
        );
        await page.locator("#greek").evaluate((e) => e.scrollIntoView({ block: "start" }));
        const readingShot = path.join(directory, `${id}-greek.png`);
        await page.screenshot({ path: readingShot });
        workflow.screenshots.push(readingShot);
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          axe.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
          [],
        );
        workflow.accessibilityViolations = 0;
        await page.locator("#published-case").click();
        workflow.reading = await download(page, "#shape-reading", `${id}-reading.html`);
        const html = await readFile(workflow.reading, "utf8");
        assert.match(html, /data:image\/jpeg;base64/);
        assert.match(html, /54\.720555/);
        assert.match(html, /κατεστραμμένον/);
        const native = await context.newPage();
        const nativeRequests = [];
        native.on("request", (r) => {
          if (/^https?:/.test(r.url())) nativeRequests.push(r.url());
        });
        await context.setOffline(true);
        await native.goto(pathToFileURL(workflow.reading).href);
        await native.evaluate(() => document.fonts.ready);
        assert.equal(
          await native.locator("img").evaluate((img) => img.complete && img.naturalWidth === 1650),
          true,
        );
        assert.equal(await native.locator("button").count(), 0);
        assert.equal(await native.locator("script").count(), 0);
        assert.deepEqual(nativeRequests, []);
        workflow.nativeCsv = await download(
          native,
          'a[download="pnigeus-shape-curves.csv"]',
          `${id}-native-curves.csv`,
        );
        assert.equal(
          await readFile(workflow.nativeCsv, "utf8"),
          await readFile(workflow.observations[0].csv, "utf8"),
        );
        if (name === "chromium" && width === 1440) {
          workflow.pdf = path.join(directory, "shapes-reading.pdf");
          await native.pdf({
            path: workflow.pdf,
            format: "A4",
            printBackground: true,
            margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
          });
        }
        await native.close();
        workflow.nativeReadingOffline = true;
        if (!development) {
          await site.close();
          await page.reload();
          await page.locator("#offline").filter({ hasText: "Ready offline" }).waitFor();
          await page.locator("#half-radius").click();
          assert.equal(await page.locator("#radius").inputValue(), "20");
          workflow.offlineReading = await download(page, "#shape-reading", `${id}-offline.html`);
          await page
            .getByRole("link", { name: "Return to the pump and listening workshop" })
            .click();
          await page.locator("#pump").focus();
          for (let i = 0; i < 3; i++) await page.keyboard.press("Enter");
          assert.equal(await page.locator("#pressure").textContent(), "854");
          await page.getByRole("link", { name: "Shape study", exact: true }).click();
          assert.equal(await page.locator("#shape-pressure").textContent(), "4481");
          workflow.offlineCrossWorkshopNavigation = true;
          workflow.offlineWithNetworkDisabled = true;
          workflow.offlineWithOriginClosed = !external;
        }
        await context.setOffline(false);
        if (!development) {
          const evicted = await page.evaluate(async () => {
            for (const name of await caches.keys())
              if (name.startsWith("pnigeus-")) await caches.delete(name);
            const channel = new MessageChannel();
            const reply = new Promise((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error("Inspection timed out")), 8000);
              channel.port1.onmessage = (event) => {
                clearTimeout(timer);
                channel.port1.close();
                resolve(event.data);
              };
            });
            navigator.serviceWorker.controller.postMessage({ type: "PNIGEUS_INSPECT" }, [
              channel.port2,
            ]);
            const result = await reply;
            return {
              complete: result.complete,
              caches: (await caches.keys()).filter((n) => n.startsWith("pnigeus-")),
            };
          });
          assert.deepEqual(evicted, { complete: false, caches: [] });
          workflow.missingCacheInspectionReadonly = true;
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(externalRequests, []);
        workflow.pageErrors = errors;
        workflow.externalRequests = externalRequests;
        receipt.workflows.push(workflow);
        console.log(
          `${id}: shape controls, geometry/CSV, Greek scan, native reading${development ? "" : ", offline navigation between both workshops"} passed`,
        );
      } finally {
        await context.close();
        await site.close();
      }
    }
    const site = await serve();
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: true });
    const page = await context.newPage();
    try {
      await page.route("**/sources/hero-schmidt-192.jpg", (route) =>
        route.fulfill({
          status: 200,
          contentType: "image/jpeg",
          body: Buffer.from("A substituted page with HTTP 200"),
        }),
      );
      await page.goto(`${site.url}shapes.html`);
      let count = 0;
      page.on("download", () => count++);
      await page.locator("#shape-reading").click();
      await page
        .locator("#shape-export-status")
        .filter({ hasText: "did not match this edition" })
        .waitFor();
      assert.equal(count, 0);
      await page.unroute("**/sources/hero-schmidt-192.jpg");
      await download(page, "#shape-reading", `${name}-source-recovered.html`);
      await page.goto(`${site.url}shapes.html?r=25&r=30&form=cone`);
      assert.match(await page.locator("#shape-warning").textContent(), /invalid or ambiguous/);
      assert.equal(await page.locator("#radius").inputValue(), "40");
      let held;
      let release;
      const hold = new Promise((resolve) => (release = resolve));
      await page.route("**/sources/hero-schmidt-192.jpg", async (route) => {
        if (route.request().resourceType() === "fetch") {
          held = true;
          await hold;
        }
        await route.continue();
      });
      const pending = page.waitForEvent("download");
      await page.locator("#shape-reading").click();
      while (!held) await page.waitForTimeout(20);
      await page.locator("#radius").focus();
      await page.keyboard.press("Home");
      assert.equal(await page.locator("#radius").inputValue(), "10");
      release();
      const captured = await pending;
      const saved = path.join(directory, `${name}-immutable.html`);
      await captured.saveAs(saved);
      const snapshot = await readFile(saved, "utf8");
      assert.match(snapshot, /80 cm rim diameter and 40 cm chamber height/);
      assert.doesNotMatch(snapshot, /20 cm rim diameter and 10 cm chamber height/);
      await page.evaluate(() => {
        navigator.clipboard.writeText = () => Promise.reject(new Error("Clipboard unavailable"));
      });
      await page.locator("#shape-share").click();
      await page.locator("#shape-share-fallback").waitFor({ state: "visible" });
      const link = await page.locator("#shape-share-fallback").textContent();
      assert.equal(new URL(link).searchParams.get("r"), "10");
      await page.goto(link);
      assert.equal(await page.locator("#radius").inputValue(), "10");
      receipt.negativeCases.push({
        engine: name,
        substitutedGreekPageRefused: true,
        sourceRecovered: true,
        duplicateStateReset: true,
        pendingExportKeptOriginalSettings: true,
        clipboardFallbackReopened: true,
      });
    } finally {
      await context.close();
      await site.close();
    }
  } finally {
    await browser.close();
  }
}
if (!development)
  assert.deepEqual(
    await files(path.join(root, "dist")),
    receipt.build,
    "Build changed during review",
  );
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Review receipt: ${output}`);
