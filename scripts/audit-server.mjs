import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
};

/** A real stoppable origin with a shared response-body bandwidth budget. */
export async function auditServer(directory) {
  let root = path.resolve(directory);
  let port = 0;
  let server;
  let bandwidth = 0;
  let cursor = 0;
  const streams = [];
  const faults = new Map();
  const requests = [];
  const timer = setInterval(() => {
    let budget = bandwidth ? Math.floor(bandwidth / 10) : 1024 * 1024 * 16;
    let visited = 0;
    while (streams.length && budget > 0 && visited < streams.length * 2) {
      cursor %= streams.length;
      const item = streams[cursor++];
      visited++;
      if (item.res.destroyed || item.res.writableEnded) continue;
      if (item.stall && item.offset >= 64) continue;
      const count = Math.min(
        budget,
        4096,
        item.bytes.length - item.offset,
        item.stall ? 64 : Infinity,
      );
      if (count > 0) {
        item.res.write(item.bytes.subarray(item.offset, item.offset + count));
        item.offset += count;
        budget -= count;
      }
      if (item.offset === item.bytes.length) item.res.end();
    }
    for (let i = streams.length - 1; i >= 0; i--)
      if (streams[i].res.destroyed || streams[i].res.writableEnded) streams.splice(i, 1);
  }, 100);
  timer.unref();
  async function start() {
    server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, "http://local");
        if (url.pathname === "/audit.html") {
          res.setHeader("Content-Type", "text/html");
          res.end("<!doctype html><title>Audit supervisor outside worker scope</title>");
          return;
        }
        if (!url.pathname.startsWith("/pnigeus/")) throw new Error("Outside scope");
        const file = decodeURIComponent(url.pathname.slice(9)) || "index.html";
        const target = path.resolve(root, file);
        if (!target.startsWith(root + path.sep)) throw new Error("Invalid path");
        const fault = faults.get(file);
        let bytes = await readFile(target);
        if (fault?.wrong) {
          bytes = Buffer.from(bytes);
          bytes[Math.floor(bytes.length / 2)] ^= 1;
        }
        requests.push({ file, bytes: bytes.length, time: Date.now() });
        res.writeHead(200, {
          "Content-Type": fault?.mime ?? MIME[path.extname(file)] ?? "application/octet-stream",
          "Content-Length": bytes.length,
          "Cache-Control": "no-store",
        });
        if (bandwidth || fault?.stall) streams.push({ bytes, offset: 0, res, stall: fault?.stall });
        else res.end(bytes);
      } catch {
        if (!res.headersSent) res.writeHead(404);
        res.end();
      }
    });
    await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
    port = server.address().port;
  }
  await start();
  return {
    get base() {
      return `http://127.0.0.1:${port}/pnigeus/`;
    },
    get supervisor() {
      return `http://127.0.0.1:${port}/audit.html`;
    },
    get requests() {
      return requests;
    },
    get activeStreams() {
      return streams.filter((item) => !item.res.destroyed && !item.res.writableEnded).length;
    },
    resetRequests() {
      requests.length = 0;
    },
    useDirectory(directory) {
      root = path.resolve(directory);
    },
    limit(bytesPerSecond) {
      bandwidth = bytesPerSecond;
    },
    fault(file, options) {
      if (options) faults.set(file, options);
      else faults.delete(file);
    },
    async stop() {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      });
    },
    start,
    async close() {
      await this.stop();
      clearInterval(timer);
    },
  };
}
