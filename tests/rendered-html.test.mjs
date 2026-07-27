import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: {
        accept: "text/html",
        host: "localhost",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Life Adventure experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Life Adventure — 人生冒险系统<\/title>/i);
  assert.match(html, /人生不是答案/);
  assert.match(html, /不是别人的人生模板/);
  assert.match(html, /使用 Google 登录/);
  assert.match(html, /还没登录？先试试公共任务/);
  assert.match(html, /你不只拥有一种未来/);
  assert.doesNotMatch(html, /Dota|三角洲行动/);
  assert.doesNotMatch(html, /sk-[A-Za-z0-9._-]+/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});
