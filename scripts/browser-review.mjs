import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(process.argv[2] ?? "/tmp/pnigeus-review/browser.json");
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
async function server() {
  const app = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://local");
      if (!url.pathname.startsWith("/pnigeus/")) {
        response.writeHead(404).end();
        return;
      }
      const relative = decodeURIComponent(url.pathname.slice(9)) || "index.html";
      const target = path.resolve(root, "dist", relative);
      if (!target.startsWith(path.join(root, "dist") + path.sep)) throw new Error("Invalid path");
      response.writeHead(200, {
        "Content-Type": mime[path.extname(target)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(await readFile(target));
    } catch {
      if (!response.headersSent) response.writeHead(404);
      response.end();
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
function commandsFor(url) {
  return (new URL(url).searchParams.get("events") ?? "")
    .split(".")
    .filter(Boolean)
    .map((token) =>
      token === "P"
        ? { type: "pump" }
        : token[0] === "K"
          ? { type: "keys", mask: Number.parseInt(token[1], 16) }
          : { type: "wait", seconds: Number(token[1]) },
    );
}
async function saveDownload(page, selector, filename) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const download = await pending;
  const target = path.join(directory, filename);
  await download.saveAs(target);
  return target;
}
async function observation(page, label, id) {
  const file = await saveDownload(page, "#csv", `${id}-${label}.csv`);
  const lines = (await readFile(file, "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const row = Object.fromEntries(
    lines
      .at(-1)
      .split(",")
      .map((value, i) => [header[i], value]),
  );
  const picture = await page.locator(".cutaway").evaluate((svg) => {
    const insidePath = svg.querySelector('[data-surface="inside"]').getAttribute("d");
    const outsidePath = svg.querySelector('[data-surface="outside"]').getAttribute("d");
    const y = (d) => Number(/^M[-\d.]+ ([-\d.]+)/.exec(d)[1]);
    return {
      pressure: Number(svg.dataset.pressure),
      inside: Number(svg.dataset.inside),
      outside: Number(svg.dataset.outside),
      svgInsideY: y(insidePath),
      svgOutsideY: y(outsidePath),
    };
  });
  assert.equal(Number(await page.locator("#pressure").textContent()), Math.round(picture.pressure));
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    "Page must fit the viewport",
  );
  return {
    label,
    tank: Number(row.total_tank_over_bell_area),
    commands: commandsFor(page.url()),
    state: {
      waterStock: Number(row.stock_ambient_litres),
      dryStock: Number(row.dry_stock_ambient_litres),
      supplied: Number(row.supplied_ambient_litres),
      waterOut: Number(row.pipe_out_ambient_litres),
      dryOut: Number(row.dry_pipe_out_ambient_litres),
      vented: Number(row.vented_ambient_litres),
      time: Number(row.time_s),
      mask: Number(row.open_pipe_mask),
    },
    reading: {
      pressure: picture.pressure,
      inside: picture.inside,
      outside: picture.outside,
      head: Number(row.head_m),
      volume: Number(row.actual_air_litres),
      reserve: Number(row.stock_ambient_litres) - 8.8,
    },
    svgInsideY: picture.svgInsideY,
    svgOutsideY: picture.svgOutsideY,
    csv: file,
  };
}
async function sound(page, id, label) {
  const wav = await saveDownload(page, "#wav", `${id}-${label}.wav`);
  const before = await page.evaluate(() => window.reviewStarts);
  await page.locator("#play").click();
  await page.waitForFunction((n) => window.reviewStarts > n, before);
  const encoded = await page.evaluate(() => window.reviewBuffer);
  const live = path.join(directory, `${id}-${label}.f32`);
  await writeFile(live, Buffer.from(encoded, "base64"));
  await page.locator("#stop").click();
  const commands = commandsFor(page.url());
  const last = commands.findLastIndex((c) => c.type === "wait");
  return {
    label,
    wav,
    live,
    tank: Number(new URL(page.url()).searchParams.get("tank") ?? 6),
    commandsBefore: commands.slice(0, last),
    seconds: commands[last].seconds,
  };
}
async function builtFiles(directory, prefix = "") {
  const all = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, item.name);
    if (item.isDirectory())
      all.push(...(await builtFiles(path.join(directory, item.name), relative)));
    else
      all.push({
        file: relative,
        sha256: createHash("sha256")
          .update(await readFile(path.join(directory, item.name)))
          .digest("hex"),
      });
  }
  return all.sort((a, b) => a.file.localeCompare(b.file));
}
const receipt = {
  build: await builtFiles(path.join(root, "dist")),
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
      const site = await server();
      const context = await browser.newContext({
        viewport: { width, height: 1040 },
        acceptDownloads: true,
      });
      await context.addInitScript(() => {
        window.reviewStarts = 0;
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (...args) {
          const bytes = new Uint8Array(this.buffer.getChannelData(0).buffer);
          let data = "";
          for (let i = 0; i < bytes.length; i += 8192)
            data += String.fromCharCode(...bytes.subarray(i, i + 8192));
          window.reviewBuffer = btoa(data);
          window.reviewStarts++;
          return start.apply(this, args);
        };
        const resume = AudioContext.prototype.resume;
        AudioContext.prototype.resume = async function () {
          await resume.call(this);
          if (window.reviewDelay)
            await new Promise((resolve) => {
              window.reviewResume = resolve;
            });
        };
      });
      const page = await context.newPage();
      const errors = [];
      const externalRequests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("request", (request) => {
        if (/^https?:/.test(request.url()) && !request.url().startsWith(site.url))
          externalRequests.push(request.url());
      });
      const workflow = { engine: name, width, observations: [], audio: [], screenshots: [] };
      try {
        await page.goto(site.url);
        await page.evaluate(() => document.fonts.ready);
        await page
          .locator("#offline")
          .filter({ hasText: "Ready offline" })
          .waitFor({ timeout: 20000 });
        await page.locator("#pump").focus();
        for (let i = 0; i < 3; i++) await page.keyboard.press("Enter");
        assert.equal(
          await page.locator("#pump").evaluate((e) => e === document.activeElement),
          true,
        );
        workflow.observations.push(await observation(page, "stored", id));
        await page.evaluate(() => scrollTo(0, 0));
        const hero = path.join(directory, `${id}-workshop.png`);
        await page.screenshot({ path: hero });
        workflow.screenshots.push(hero);
        await page.locator("#tank").selectOption("3");
        workflow.observations.push(await observation(page, "small-tank", id));
        await page.locator("#tank").selectOption("12");
        workflow.observations.push(await observation(page, "large-tank", id));
        await page.locator("#tank").selectOption("6");
        await page.locator("#key-0").focus();
        await page.keyboard.press("Space");
        assert.equal(await page.locator("#key-0").isChecked(), true);
        await page.locator("#seconds").selectOption("5");
        await page.locator("#release").click();
        workflow.observations.push(await observation(page, "one-pipe", id));
        workflow.audio.push(await sound(page, id, "one-pipe"));
        const starts = await page.evaluate(() => {
          window.reviewDelay = true;
          return window.reviewStarts;
        });
        await page.locator("#play").click();
        await page.waitForFunction(() => Boolean(window.reviewResume));
        await page.locator("#stop").click();
        await page.evaluate(() => {
          window.reviewDelay = false;
          window.reviewResume();
        });
        await page.waitForTimeout(50);
        assert.equal(
          await page.evaluate(() => window.reviewStarts),
          starts,
          "Stop must win over delayed resume",
        );
        for (let i = 1; i < 4; i++) await page.locator(`#key-${i}`).check();
        await page.locator("#pump").click();
        await page.locator("#release").click();
        workflow.observations.push(await observation(page, "four-pipes", id));
        workflow.audio.push(await sound(page, id, "four-pipes"));
        const beforeUndo = page.url();
        const beforePressure = await page.locator("#pressure").textContent();
        await page.locator("#undo").click();
        assert.notEqual(page.url(), beforeUndo);
        await page.goBack();
        assert.equal(await page.locator("#pressure").textContent(), beforePressure);
        for (let i = 0; i < 14; i++) await page.locator("#pump").click();
        workflow.observations.push(await observation(page, "venting", id));
        assert.ok(workflow.observations.at(-1).state.vented > 0);
        await page.locator("#dry").check();
        assert.equal(await page.locator('[data-trace="dry"]').count(), 1);
        await page.locator('[data-word="funnel"]').click();
        assert.match(await page.locator("#word-note").textContent(), /agrees with the neuter/);
        await page.locator('[data-word="aqua"]').click();
        assert.match(await page.locator("#word-note").textContent(), /nominative subject/);
        await page
          .locator(width === 375 ? ".source-tag" : ".source-section")
          .evaluate((element) => element.scrollIntoView({ block: "start" }));
        const readingShot = path.join(directory, `${id}-reading.png`);
        await page.screenshot({ path: readingShot });
        workflow.screenshots.push(readingShot);
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        workflow.accessibilityViolations = 0;
        workflow.csv = await saveDownload(page, "#csv", `${id}-final.csv`);
        workflow.finalCommands = commandsFor(page.url());
        workflow.tank = 6;
        // Save the finite one-pipe example, rather than a later full chamber.
        await page.locator('[data-example="sound"]').click();
        workflow.study = await saveDownload(page, "#study", `${id}-reading.html`);
        const html = await readFile(workflow.study, "utf8");
        assert.match(html, /data:image\/jpeg;base64/);
        assert.match(html, /data:audio\/wav;base64/);
        assert.match(html, /Latin word notes/);
        const native = await context.newPage();
        const nativeExternal = [];
        native.on("request", (req) => {
          if (/^https?:/.test(req.url())) nativeExternal.push(req.url());
        });
        await context.setOffline(true);
        await native.goto(pathToFileURL(workflow.study).href);
        await native.evaluate(() => document.fonts.ready);
        assert.equal(
          await native.locator("img").evaluate((img) => img.complete && img.naturalWidth > 0),
          true,
        );
        assert.equal(
          await native.locator("audio").evaluate((audio) => audio.readyState >= 1),
          true,
        );
        assert.equal(await native.locator("button").count(), 0);
        assert.deepEqual(nativeExternal, []);
        if (name === "chromium" && width === 1440) {
          workflow.pdf = path.join(directory, "one-pipe-reading.pdf");
          await native.pdf({
            path: workflow.pdf,
            format: "A4",
            printBackground: true,
            margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
          });
        }
        await native.close();
        await site.close();
        // Origin sockets are now closed in addition to the browser being offline.
        await page.reload();
        await page.locator("#offline").filter({ hasText: "Ready offline" }).waitFor();
        await page.locator("#pump").click();
        assert.ok(Number(await page.locator("#pressure").textContent()) > 0);
        workflow.offlineReading = await saveDownload(page, "#study", `${id}-offline.html`);
        workflow.offlineWithOriginClosed = true;
        await context.setOffline(false);
        assert.deepEqual(errors, []);
        assert.deepEqual(externalRequests, []);
        workflow.pageErrors = errors;
        workflow.externalRequests = externalRequests;
        receipt.workflows.push(workflow);
        console.log(
          `${id}: controls, source reading, actual SVG/CSV, WAV/live audio, saved HTML, accessibility and offline passed`,
        );
      } finally {
        await context.close();
        await site.close();
      }
    }
    const site = await server();
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    try {
      await page.route("**/sources/hero-fig76.jpg", (route) =>
        route.fulfill({
          status: 200,
          contentType: "image/jpeg",
          body: Buffer.from("A different source returned with HTTP 200"),
        }),
      );
      await page.goto(`${site.url}?events=P.P.P.K1.W5`);
      let downloads = 0;
      page.on("download", () => downloads++);
      await page.locator("#study").click();
      await page
        .locator("#export-status")
        .filter({ hasText: "did not match this edition" })
        .waitFor();
      assert.equal(downloads, 0);
      await page.unroute("**/sources/hero-fig76.jpg");
      await saveDownload(page, "#study", `${name}-recovered.html`);
      await page.goto(`${site.url}?tank=6&tank=3&events=P`);
      assert.match(await page.locator("#warning").textContent(), /invalid or ambiguous/);
      assert.equal(await page.locator("#pressure").textContent(), "0");
      receipt.negativeCases.push({
        engine: name,
        substitutedSourceRefused: true,
        recovered: true,
        duplicateStateReset: true,
      });
    } finally {
      await context.close();
      await site.close();
    }
  } finally {
    await browser.close();
  }
}
assert.deepEqual(
  await builtFiles(path.join(root, "dist")),
  receipt.build,
  "The build changed during review",
);
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Review receipt: ${output}`);
