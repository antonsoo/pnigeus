import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.resolve(process.argv[2] ?? "/tmp/claude-1000/pnigeus-timing/browser");
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
async function serve(claim = true) {
  let heldSource = null;
  const server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://local");
      assert.ok(u.pathname.startsWith("/pnigeus/"));
      const file = path.resolve(
        root,
        "dist",
        decodeURIComponent(u.pathname.slice(9)) || "index.html",
      );
      assert.ok(file.startsWith(path.join(root, "dist") + path.sep));
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      const original = await readFile(file);
      const bytes =
        !claim && file.endsWith("sw.js")
          ? Buffer.from(original.toString().replace("self.clients.claim()", "Promise.resolve()"))
          : original;
      if (heldSource && file.endsWith("hero-fig76.jpg")) {
        res.write(bytes.subarray(0, 64));
        heldSource.started();
        await heldSource.pending;
        res.end(bytes.subarray(64));
      } else res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    base: `http://127.0.0.1:${server.address().port}/pnigeus/`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
    holdSource() {
      let started;
      let finish;
      const ready = new Promise((resolve) => {
        started = resolve;
      });
      const pending = new Promise((resolve) => {
        finish = resolve;
      });
      heldSource = { started, pending };
      return {
        ready,
        release() {
          heldSource = null;
          finish();
        },
      };
    },
  };
}
async function text(page, selector) {
  return (await page.locator(selector).textContent()).trim();
}
async function downloaded(page, selector, name) {
  const waiting = page.waitForEvent("download");
  await page.locator(selector).click();
  const file = path.join(directory, name);
  await (await waiting).saveAs(file);
  return file;
}
function rows(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const keys = lines.shift().split(",");
  return lines.map((line) =>
    Object.fromEntries(
      line.split(",").map((s, i) => [keys[i], Number.isNaN(Number(s)) ? s : Number(s)]),
    ),
  );
}
const receipt = {
  boundary: "local production build; no publication claim",
  cases: [],
  browsers: [],
};
const sourceHash = createHash("sha256")
  .update(await readFile(path.join(root, "public/sources/hero-fig76.jpg")))
  .digest("hex");

for (const [name, engine] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await engine.launch();
  try {
    for (const width of [1440, 375]) {
      const id = `${name}-${width}`;
      const server = await serve();
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        acceptDownloads: true,
      });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(server.base);
        await page.getByRole("link", { name: "Pump timing", exact: true }).click();
        await page.locator("#timing-within").waitFor();
        assert.equal(await text(page, "#timing-within"), "3.679");
        await page.locator("#timing-keep").click();
        await page.locator('[data-timing-preset="clear"]').click();
        const schedule = [0, 1, 2, 1, 1, 2];
        for (let i = 0; i < 6; i++)
          await page.locator(`#slot-${i}`).selectOption(String(schedule[i]));
        assert.equal(await text(page, "#timing-within"), "12.000");
        assert.match(await text(page, "#timing-kept"), /7 \/ 0 \/ 0 \/ 0 \/ 0 \/ 0.*3\.679 s/);
        assert.equal(await page.locator('[data-timing-trace="kept"]').count(), 1);
        assert.equal(
          await page.locator("#slot-0 option[value='1']").evaluate((e) => e.disabled),
          true,
        );

        // Operate a native select using the keyboard, retaining its focus.
        await page.locator("#slot-5").focus();
        await page.keyboard.press("ArrowUp");
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#slot-5").inputValue(), "1");
        assert.equal(
          await page.locator("#slot-5").evaluate((e) => document.activeElement === e),
          true,
        );
        await page.locator("#slot-5").selectOption("2");
        await page.locator("#timing-search").click();
        assert.match(
          await text(page, "#timing-search-result"),
          /792 allocations.*4 stay in target/,
        );
        await page.locator("#timing-pipes").selectOption("4");
        assert.equal(await page.locator("#timing-load-best").isHidden(), true);
        await page.locator("#timing-search").click();
        assert.match(await text(page, "#timing-search-result"), /0 stay in target/);
        await page.goBack();
        assert.equal(await page.locator("#timing-pipes").inputValue(), "2");
        assert.equal(await text(page, "#timing-within"), "12.000");
        assert.equal(await page.locator("#timing-load-best").isHidden(), true);
        await page.locator("#timing-search").click();
        await page.locator("#timing-load-best").click();
        assert.equal(await text(page, "#timing-within"), "12.000");
        await page.locator("#timing-share").click();
        const shared = new URL(await page.locator("#timing-link").getAttribute("href"));
        assert.equal(shared.hostname, "antonsoo.github.io");
        assert.equal(shared.searchParams.get("strokes"), "0.1.2.1.1.2");

        const csvFile = await downloaded(page, "#timing-csv", `${id}-intervals.csv`);
        const slots = rows(await readFile(csvFile, "utf8"));
        assert.equal(slots.length, 6);
        const within = slots.reduce((sum, s) => sum + s.within_s, 0);
        assert.ok(Math.abs(within - Number(await text(page, "#timing-within"))) < 0.0005);
        const eventsFile = await downloaded(page, "#timing-events", `${id}-events.csv`);
        const events = rows(await readFile(eventsFile, "utf8"));
        const end = events.at(-1);
        assert.equal(end.time_s, 12);
        assert.equal(end.supplied_ambient_litres, 10);
        assert.ok(
          Math.abs(
            10 -
              end.pipe_out_ambient_litres -
              end.vented_ambient_litres -
              (end.stock_ambient_litres - 8.8),
          ) < 1e-10,
        );
        // Independently map the *drawn* polyline back to pressure/time and CSV.
        const graph = await page.locator(".timing-plot").evaluate((svg) => ({
          width: svg.viewBox.baseVal.width,
          maximum: Number(svg.dataset.maximum),
          d: svg.querySelector('[data-timing-trace="current"]').getAttribute("d"),
        }));
        const vertices = [...graph.d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => ({
          time: ((Number(m[1]) - 52) / (graph.width - 20 - 52)) * 12,
          pressure: ((250 - Number(m[2])) / 222) * graph.maximum,
        }));
        for (const slot of slots) {
          assert.ok(
            vertices.some(
              (v) =>
                Math.abs(v.time - slot.start_s) < 0.0001 &&
                Math.abs(v.pressure - slot.release_start_pa) < 0.02,
            ),
          );
          assert.ok(
            vertices.some(
              (v) =>
                Math.abs(v.time - slot.end_s) < 0.0001 &&
                Math.abs(v.pressure - slot.release_end_pa) < 0.02,
            ),
          );
        }
        receipt.cases.push({
          type: "case",
          settings: {
            tank: slots[0].tank_over_chamber_area,
            pipes: slots[0].open_pipes,
            strokes: slots.map((s) => s.strokes),
          },
          slots: slots.map((s) => ({
            peak: s.release_start_pa,
            trough: s.release_end_pa,
            below: s.below_s,
            within: s.within_s,
            above: s.above_s,
          })),
          within,
          complete: /All twelve/.test(await text(page, "#timing-verdict")),
        });

        const note =
          'Higher early pressure consumes air sooner. <img src=x onerror="alert(1)"> & later reserve.';
        await page.locator("#timing-note").fill(note);
        await page.locator("#timing").screenshot({ path: path.join(directory, `${id}.png`) });
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        const axe = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(axe.violations, []);
        const reading = await downloaded(page, "#timing-reading", `${id}-reading.html`);
        const saved = await readFile(reading, "utf8");
        assert.ok(!saved.includes("<script"));
        assert.ok(saved.includes("&lt;img src=x"));
        // Load the artifact as a local file with JavaScript disabled and network blocked.
        const nativeContext = await browser.newContext({
          javaScriptEnabled: false,
          viewport: { width, height: 1000 },
          acceptDownloads: true,
        });
        await nativeContext.route("https://**", (route) => route.abort());
        const native = await nativeContext.newPage();
        await native.goto(pathToFileURL(reading).href);
        assert.equal(await native.locator(".timing-static-narrow").isVisible(), width === 375);
        assert.equal(await native.locator(".timing-static-wide").isVisible(), width === 1440);
        const visiblePlot = native.locator(
          width === 375 ? ".timing-static-narrow svg" : ".timing-static-wide svg",
        );
        assert.equal(
          await visiblePlot.getAttribute("viewBox"),
          width === 375 ? "0 0 380 300" : "0 0 960 300",
        );
        const axisBounds = await visiblePlot.locator("text").evaluateAll((texts) =>
          texts.map((t) => {
            const box = t.getBBox();
            const svg = t.ownerSVGElement;
            return {
              left: box.x,
              right: box.x + box.width,
              width: svg.viewBox.baseVal.width,
              renderedFont:
                (parseFloat(getComputedStyle(t).fontSize) * svg.getBoundingClientRect().width) /
                svg.viewBox.baseVal.width,
            };
          }),
        );
        assert.ok(
          axisBounds.every((t) => t.left >= 0 && t.right <= t.width && t.renderedFont >= 12),
        );
        assert.ok((await native.locator("body").textContent()).includes(note));
        const image = await native.locator('img[src^="data:image/jpeg"]').getAttribute("src");
        assert.equal(
          createHash("sha256")
            .update(Buffer.from(image.split(",")[1], "base64"))
            .digest("hex"),
          sourceHash,
        );
        const nativeDownload = await downloaded(
          native,
          'a[download="pnigeus-timing.csv"]',
          `${id}-native.csv`,
        );
        assert.equal(await readFile(nativeDownload, "utf8"), await readFile(csvFile, "utf8"));
        if (name === "chromium" && width === 1440)
          await native.pdf({
            path: path.join(directory, "reading.pdf"),
            format: "A4",
            printBackground: true,
          });
        await nativeContext.close();

        let neededReload = false;
        try {
          await page.waitForFunction(
            () =>
              document.querySelector("#offline")?.textContent.startsWith("Ready offline") ||
              document.querySelector("#offline-reload")?.hidden === false,
          );
          if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
            assert.ok(!(await text(page, "#offline")).startsWith("Ready offline"));
            await page.locator("#offline-reload").click();
            neededReload = true;
          }
          await page.waitForFunction(
            () =>
              navigator.serviceWorker.controller &&
              document.querySelector("#offline")?.textContent.startsWith("Ready offline"),
          );
        } catch (error) {
          const state = await page.evaluate(async () => ({
            status: document.querySelector("#offline").textContent,
            controller: navigator.serviceWorker.controller?.scriptURL,
            registrations: (await navigator.serviceWorker.getRegistrations()).map((r) => ({
              active: r.active?.state,
              installing: r.installing?.state,
              waiting: r.waiting?.state,
            })),
            caches: await Promise.all(
              (await caches.keys()).map(async (key) => ({
                key,
                files: (await (await caches.open(key)).keys()).map((r) => r.url),
              })),
            ),
          }));
          await writeFile(
            path.join(directory, `${id}-offline-failure.json`),
            JSON.stringify(state, null, 2),
          );
          throw error;
        }
        await server.close();
        await context.setOffline(true);
        await page.reload();
        await page.locator("#timing-within").waitFor();
        assert.equal(await text(page, "#timing-within"), "12.000");
        await page.locator("#timing-search").click();
        assert.match(await text(page, "#timing-search-result"), /4 stay in target/);
        await downloaded(page, "#timing-reading", `${id}-offline.html`);
        await page.goto(`${server.base}shapes.html`);
        await page.locator("#shape-workshop").waitFor();
        await page.getByRole("link", { name: "Pump timing", exact: true }).click();
        await page.locator("#timing-within").waitFor();
        assert.equal(await text(page, "#timing-within"), "3.679");
        assert.deepEqual(errors, []);
        receipt.browsers.push({
          id,
          keyboard: true,
          budget: true,
          comparison: true,
          search: true,
          history: true,
          actualCsvAndGraph: true,
          nativeReadingAndDownload: true,
          sourceSha256: sourceHash,
          accessibility: true,
          offlineWithStoppedOrigin: true,
          controlledReloadNeeded: neededReload,
          pageErrors: errors,
        });
        console.log(
          `${id}: timing, retained comparison, exhaustive search, actual CSV/graph, native reading, source identity and stopped-origin offline passed`,
        );
      } finally {
        await context.close();
        await server.close();
      }
    }

    // Reproduce the observed "saved but uncontrolled" state deterministically:
    // use the actual generated worker, suppressing only its immediate claim.
    const unclaimed = await serve(false);
    const cold = await browser.newContext();
    try {
      const page = await cold.newPage();
      await page.goto(`${unclaimed.base}timing.html?strokes=0.1.2.1.1.2`);
      await page.waitForFunction(() => document.querySelector("#offline-reload")?.hidden === false);
      assert.equal(await page.evaluate(() => navigator.serviceWorker.controller === null), true);
      assert.match(await text(page, "#offline"), /not yet controlled/);
      assert.ok(!(await text(page, "#offline")).startsWith("Ready offline"));
      await page.locator("#offline-reload").click();
      await page.waitForFunction(
        () =>
          navigator.serviceWorker.controller &&
          document.querySelector("#offline")?.textContent.startsWith("Ready offline"),
      );
      assert.equal(await text(page, "#timing-within"), "12.000");
      assert.equal(await page.locator("#offline-reload").isHidden(), true);
      receipt.browsers.push({
        id: `${name}-uncontrolled`,
        savedIsNotReady: true,
        explicitReloadRetainsUrlSettings: true,
        readinessRequiresController: true,
        setup: "actual generated worker with clients.claim suppressed",
      });
    } finally {
      await cold.close();
      await unclaimed.close();
    }

    // Faults need an uncontrolled context so real requests reach the delayed route.
    const server = await serve();
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: true });
    try {
      const page = await context.newPage();
      await page.goto(`${server.base}timing.html?strokes=7.7.0.0.0.0`);
      assert.match(await text(page, "#timing-warning"), /invalid or ambiguous/);
      let release;
      let entered;
      const waiting = new Promise((resolve) => {
        entered = resolve;
      });
      const delayed = new Promise((resolve) => {
        release = resolve;
      });
      await context.route("**/sources/hero-fig76.jpg", async (route) => {
        entered();
        await delayed;
        await route.continue();
      });
      const pending = page.waitForEvent("download");
      await page.locator("#timing-note").fill("Captured before assets arrived.");
      await page.locator("#timing-keep").click();
      await page.locator("#timing-reading").click();
      await waiting;
      await page.locator('[data-timing-preset="late"]').click();
      await page.locator("#timing-keep").click();
      await page.locator("#timing-note").fill("Changed after saving began.");
      release();
      const file = path.join(directory, `${name}-snapshot.html`);
      await (await pending).saveAs(file);
      const html = await readFile(file, "utf8");
      assert.ok(html.includes("Captured before assets arrived."));
      assert.ok(!html.includes("Changed after saving began."));
      assert.ok(html.includes("strokes at 0, 2, 4, 6, 8, 10 s: 7, 0, 0, 0, 0, 0"));
      assert.ok(!html.includes("strokes at 0, 2, 4, 6, 8, 10 s: 0, 0, 0, 0, 0, 7"));
      await context.unroute("**/sources/hero-fig76.jpg");
      await context.route("**/sources/hero-fig76.jpg", (route) =>
        route.fulfill({
          status: 200,
          contentType: "image/jpeg",
          body: "wrong bytes despite HTTP success",
        }),
      );
      let unexpected = false;
      page.on("download", () => {
        unexpected = true;
      });
      await page.locator("#timing-reading").click();
      await page.waitForFunction(() =>
        document.querySelector("#timing-export-status").textContent.includes("did not match"),
      );
      assert.equal(unexpected, false);
      await context.unroute("**/sources/hero-fig76.jpg");
      const held = server.holdSource();
      await page.locator("#timing-reading").click();
      await held.ready;
      // The server sent headers and 64 real image bytes, but will not finish the body.
      await page.locator("#timing-cancel").click();
      await page.waitForFunction(() =>
        document.querySelector("#timing-export-status").textContent.includes("Saving cancelled"),
      );
      assert.equal(await page.locator("#timing-reading").isEnabled(), true);
      assert.equal(await page.locator("#timing-note").inputValue(), "Changed after saving began.");
      assert.equal(unexpected, false);
      held.release();
      await downloaded(page, "#timing-reading", `${name}-after-cancel.html`);
      receipt.browsers.push({
        id: `${name}-faults`,
        invalidQuery: true,
        delayedSaveSnapshot: true,
        corruptSourceRefused: true,
        stalledBodyCancelledAndRetried: true,
      });
    } finally {
      await context.close();
      await server.close();
    }
  } finally {
    await browser.close();
  }
}
await writeFile(path.join(directory, "review.json"), `${JSON.stringify(receipt, null, 2)}\n`);
await writeFile(
  path.join(directory, "browser-cases.jsonl"),
  `${receipt.cases.map((s) => JSON.stringify(s)).join("\n")}\n`,
);
console.log(`Review receipt: ${path.join(directory, "review.json")}`);
