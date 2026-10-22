import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, firefox } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:4386/pnigeus/";
const output = path.resolve(process.argv[3] ?? "/tmp/pnigeus-review/development.json");
await mkdir(path.dirname(output), { recursive: true });
const records = [];
for (const [name, engine] of Object.entries({ chromium, firefox })) {
  const browser = await engine.launch({
    headless: true,
    ...(name === "chromium" ? { args: ["--disable-dev-shm-usage"] } : {}),
  });
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });
        await page.goto(url);
        await page.evaluate(() => document.fonts.ready);
        const style = await page.evaluate(() => ({
          font: getComputedStyle(document.body).fontFamily,
          background: getComputedStyle(document.documentElement).backgroundColor,
          layout: getComputedStyle(document.querySelector(".bench")).display,
          overflow: document.documentElement.scrollWidth > innerWidth,
          drawingStroke: getComputedStyle(document.querySelector(".bell-body")).stroke,
        }));
        assert.match(style.font, /Workshop/);
        assert.equal(style.background, "rgb(232, 239, 243)");
        assert.equal(style.layout, width === 375 ? "block" : "grid");
        assert.equal(style.drawingStroke, "rgb(147, 100, 21)");
        assert.equal(style.overflow, false);
        assert.match(await page.locator("#offline").textContent(), /published build/);
        await page.locator("#pump").focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#pressure").textContent(), "286");
        await page.locator("#key-0").check();
        await page.locator("#release").click();
        const pending = page.waitForEvent("download");
        await page.locator("#study").click();
        const download = await pending;
        const target = path.join(path.dirname(output), `${name}-${width}-development.html`);
        await download.saveAs(target);
        const html = await readFile(target, "utf8");
        assert.match(html, /data:image\/jpeg;base64/);
        assert.match(html, /data:audio\/wav;base64/);
        assert.match(html, /Edition development/);
        await page.locator("#reset").click();
        assert.equal(await page.locator("#pressure").textContent(), "0");
        assert.deepEqual(errors, []);
        records.push({
          engine: name,
          width,
          style,
          pump: true,
          release: true,
          reading: true,
          reset: true,
          errors,
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(output, `${JSON.stringify({ passed: true, records }, null, 2)}\n`);
console.log("Four styled development workflows and real reading downloads passed.");
