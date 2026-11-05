import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";
import { auditServer } from "./audit-server.mjs";

const output = path.resolve(process.argv[2] ?? "/tmp/claude-1000/pnigeus-notebooks");
await mkdir(output, { recursive: true });
const receipt = [];
const cases = [];
for (const [name, engine] of Object.entries({ chromium, firefox })) {
  const browser = await engine.launch();
  try {
    for (const width of [1440, 375]) {
      const server = await auditServer(path.resolve("dist"));
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        acceptDownloads: true,
      });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.addInitScript(() => {
          const original = File.prototype.text;
          File.prototype.text = async function () {
            const text = await original.call(this);
            if (this.name.startsWith("delayed"))
              await new Promise((resolve) => {
                window.releaseFile = resolve;
              });
            return text;
          };
        });
        await page.goto(`${server.base}timing.html?pipes=1`);
        await page.locator("#timing-search").click();
        assert.match(
          await page.locator("#timing-search-result").textContent(),
          /792 allocations.*0 stay in target/,
        );
        await page.locator("#timing-keep").click();
        await page.locator("#timing-rule").selectOption("at-most");
        assert.equal(await page.locator("#timing-load-best").isHidden(), true);
        await page.locator("#timing-search").click();
        assert.match(
          await page.locator("#timing-search-result").textContent(),
          /1716 allocations.*22 stay.*Fewest extra strokes.*3/,
        );
        await page.locator("#timing-load-best").click();
        assert.equal(await page.locator("#timing-within").textContent(), "12.000");
        assert.match(await page.locator("#timing-budget").textContent(), /^4 of seven/);
        await page.locator("#timing-share").click();
        assert.match(await page.locator("#timing-link").getAttribute("href"), /allow=unspent/);
        const note = '<img src=x onerror="alert(1)"> Less air; full time. ἀήρ';
        await page.locator("#timing-note").fill(note);
        async function save(selector, filename) {
          const waiting = page.waitForEvent("download");
          await page.locator(selector).click();
          const destination = path.join(output, `${name}-${width}-${filename}`);
          await (await waiting).saveAs(destination);
          return destination;
        }
        const csvFile = await save("#timing-csv", "intervals.csv");
        const lines = (await readFile(csvFile, "utf8")).trim().split(/\r?\n/);
        const keys = lines.shift().split(",");
        const rows = lines.map((line) =>
          Object.fromEntries(line.split(",").map((v, i) => [keys[i], Number(v)])),
        );
        cases.push({
          type: "case",
          settings: {
            tank: rows[0].tank_over_chamber_area,
            pipes: rows[0].open_pipes,
            strokes: rows.map((r) => r.strokes),
          },
          slots: rows.map((r) => ({
            peak: r.release_start_pa,
            trough: r.release_end_pa,
            below: r.below_s,
            within: r.within_s,
            above: r.above_s,
          })),
          within: rows.reduce((s, r) => s + r.within_s, 0),
          complete: true,
        });
        const file = await save("#notebook-save", "notebook.json");
        const original = await readFile(file, "utf8");
        const book = JSON.parse(original);
        assert.equal(book.searchMode, "at-most");
        assert.deepEqual(book.current.strokes, [0, 0, 1, 0, 1, 1]);
        assert.deepEqual(book.kept.strokes, [7, 0, 0, 0, 0, 0]);
        const html = await save("#timing-reading", "reading.html");
        const nativeContext = await browser.newContext({
          javaScriptEnabled: false,
          acceptDownloads: true,
        });
        const native = await nativeContext.newPage();
        await native.goto(pathToFileURL(html).href);
        const download = native.waitForEvent("download");
        await native.locator('a[download="pnigeus-timing-notebook.json"]').click();
        const nativeFile = path.join(output, `${name}-${width}-native.json`);
        await (await download).saveAs(nativeFile);
        assert.equal(await readFile(nativeFile, "utf8"), original);
        await nativeContext.close();
        await page.locator("#timing-note").fill("New work, keep me.");
        await page.locator('[data-timing-preset="clear"]').click();
        await page.locator("#notebook-open").setInputFiles(file);
        await page.waitForFunction(() =>
          document.querySelector("#timing-note").value.includes("Less air"),
        );
        assert.equal(await page.locator("#timing-within").textContent(), "12.000");
        await page.locator("#timing-note").fill(`${note} Edited after reopening.`);
        await page.locator("#notebook-previous").click();
        assert.equal(await page.locator("#timing-note").inputValue(), "New work, keep me.");
        await page.locator("#notebook-previous").click();
        assert.equal(
          await page.locator("#timing-note").inputValue(),
          `${note} Edited after reopening.`,
        );
        const altered = {
          ...book,
          parameters: { ...book.parameters, exercise: { ...book.parameters.exercise, low: 401 } },
        };
        for (const [filename, content] of [
          ["broken.json", "{"],
          ["different.json", JSON.stringify(altered)],
        ]) {
          await page.locator("#notebook-open").setInputFiles({
            name: filename,
            mimeType: "application/json",
            buffer: Buffer.from(content),
          });
          await page.waitForFunction(() =>
            document.querySelector("#notebook-status").textContent.includes("unchanged"),
          );
          assert.equal(
            await page.locator("#timing-note").inputValue(),
            `${note} Edited after reopening.`,
          );
          assert.equal(await page.locator("#timing-within").textContent(), "12.000");
        }
        await page.locator("#notebook-open").setInputFiles({
          name: "delayed.json",
          mimeType: "application/json",
          buffer: Buffer.from(original),
        });
        await page.waitForFunction(() => Boolean(window.releaseFile));
        await page.locator("#timing-note").fill("Edited while opening.");
        await page.evaluate(() => window.releaseFile());
        await page.locator("#notebook-conflict").waitFor();
        assert.equal(await page.locator("#timing-note").inputValue(), "Edited while opening.");
        await page.locator("#notebook-accept").click();
        assert.equal(await page.locator("#timing-note").inputValue(), note);
        await page.locator("#notebook-previous").click();
        assert.equal(await page.locator("#timing-note").inputValue(), "Edited while opening.");
        await page.locator("#notebook-previous").click();
        const axe = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(axe.violations, []);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await page
          .locator("#timing")
          .screenshot({ path: path.join(output, `${name}-${width}.png`) });
        await page.waitForFunction(
          () =>
            navigator.serviceWorker.controller &&
            document.querySelector("#offline").textContent.startsWith("Ready offline"),
        );
        await server.stop();
        await context.setOffline(true);
        await page.reload();
        await page.locator("#notebook-open").setInputFiles(file);
        await page.waitForFunction(() =>
          document.querySelector("#timing-note").value.includes("Less air"),
        );
        assert.equal(await page.locator("#timing-within").textContent(), "12.000");
        await save("#timing-reading", "offline.html");
        assert.deepEqual(errors, []);
        receipt.push({
          name,
          width,
          exactVersusUnused: true,
          nativeNotebook: true,
          importPreservesPreviousEdits: true,
          invalidImportUnchanged: true,
          delayedImportRequiresChoice: true,
          offlineWithStoppedOrigin: true,
          accessibility: true,
        });
        console.log(
          `${name}-${width}: alternate budget, editable accounts, delayed-file conflict, native notebook and offline reopen passed`,
        );
      } finally {
        await context.close();
        await server.close();
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(path.join(output, "review.json"), `${JSON.stringify(receipt, null, 2)}\n`);

await writeFile(
  path.join(output, "browser-cases.jsonl"),
  `${cases.map((c) => JSON.stringify(c)).join("\n")}\n`,
);
