import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, type ServerResponse } from "node:http";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { verifiedBytes } from "../src/asset-transfer.js";

const body = Buffer.from("Verified source bytes, not an HTTP status.");
const identity = { bytes: body.length, sha256: createHash("sha256").update(body).digest("hex") };

async function origin(reply: (res: ServerResponse) => void) {
  const server = createServer((_req, res) => reply(res));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test origin");
  return {
    url: `http://127.0.0.1:${address.port}/source`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}

test("active chunks can outlast the idle limit; the original response remains available", async () => {
  const site = await origin((res) => {
    let i = 0;
    const timer = setInterval(() => {
      if (i === body.length) {
        clearInterval(timer);
        res.end();
      } else res.write(body.subarray(i, ++i));
    }, 5);
    res.on("close", () => clearInterval(timer));
  });
  try {
    const start = performance.now();
    const result = await verifiedBytes(site.url, identity, {
      idleMs: 100,
      totalMs: 2000,
      preserveResponse: true,
    });
    assert.ok(performance.now() - start > 100);
    assert.deepEqual(Buffer.from(result.bytes), body);
    assert.equal(result.response.url, site.url);
    assert.deepEqual(Buffer.from(await result.response.arrayBuffer()), body);
  } finally {
    await site.close();
  }
});

test("decoded bytes determine length and identity for compressed responses", async () => {
  const site = await origin((res) => {
    res.setHeader("Content-Encoding", "gzip");
    const compressed = gzipSync(body);
    res.setHeader("Content-Length", compressed.length);
    res.end(compressed);
  });
  try {
    assert.deepEqual(Buffer.from((await verifiedBytes(site.url, identity)).bytes), body);
  } finally {
    await site.close();
  }
});

test("a body that begins but stalls is bounded, and a healthy retry succeeds", async () => {
  let stall = true;
  const site = await origin((res) => {
    if (stall) res.write(body.subarray(0, 1));
    else res.end(body);
  });
  try {
    await assert.rejects(verifiedBytes(site.url, identity, { idleMs: 40 }), /stopped arriving/);
    stall = false;
    assert.deepEqual(Buffer.from((await verifiedBytes(site.url, identity)).bytes), body);
  } finally {
    await site.close();
  }
});

test("correct-length wrong bytes, truncation and oversized bodies all fail closed", async () => {
  for (const bytes of [
    Buffer.alloc(body.length, 1),
    body.subarray(0, body.length - 1),
    Buffer.concat([body, body]),
  ]) {
    const site = await origin((res) => res.end(bytes));
    try {
      await assert.rejects(verifiedBytes(site.url, identity), /did not match/);
    } finally {
      await site.close();
    }
  }
});

test("external cancellation and total deadlines terminate unfinished response bodies", async () => {
  const site = await origin((res) => {
    const timer = setInterval(() => res.write(body.subarray(0, 1)), 10);
    res.on("close", () => clearInterval(timer));
  });
  try {
    const controller = new AbortController();
    const pending = verifiedBytes(site.url, identity, { signal: controller.signal });
    setTimeout(() => controller.abort(new Error("Learner cancelled")), 30);
    await assert.rejects(pending, /Learner cancelled/);
    await assert.rejects(verifiedBytes(site.url, identity, { totalMs: 50 }), /transfer limit/);
  } finally {
    await site.close();
  }
});
