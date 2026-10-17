import { assertEquals } from "@std/assert";
import server from "./main.ts";

const info: Deno.ServeHandlerInfo<Deno.NetAddr> = {
  remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 0 },
  completed: Promise.resolve(),
};

const get = async (
  path: string,
  headers: HeadersInit = {},
): Promise<Response> =>
  await server.fetch(new Request(`http://localhost${path}`, { headers }), info);

const decompress = (response: Response): Promise<string> =>
  new Response(response.body!.pipeThrough(new DecompressionStream("gzip")))
    .text();

Deno.test("gzips text responses for clients that accept gzip", async () => {
  const response = await get("/site.css", { "accept-encoding": "gzip, br" });
  assertEquals(response.headers.get("content-encoding"), "gzip");
  assertEquals(response.headers.get("content-length"), null);
  assertEquals(response.headers.get("vary"), "accept-encoding");
  assertEquals(
    await decompress(response),
    await Deno.readTextFile("public/site.css"),
  );
});

Deno.test("sends plain text when the client does not accept gzip", async () => {
  for (const encoding of ["br", "gzip;q=0", ""]) {
    const response = await get("/", { "accept-encoding": encoding });
    assertEquals(response.headers.get("content-encoding"), null);
    assertEquals(response.headers.get("vary"), "accept-encoding");
    assertEquals(
      await response.text(),
      await Deno.readTextFile("public/index.html"),
    );
  }
});

Deno.test("keeps the plain-text type for Effective and TypeScript sources", async () => {
  const response = await get("/typed-ir.ts", { "accept-encoding": "gzip" });
  assertEquals(
    response.headers.get("content-type"),
    "text/plain; charset=utf-8",
  );
  assertEquals(response.headers.get("content-encoding"), "gzip");
  await response.body?.cancel();
});

Deno.test("does not compress fonts or images", async () => {
  for (
    const path of ["/fonts/bricolage-grotesque-latin.woff2", "/og-image.png"]
  ) {
    const response = await get(path, { "accept-encoding": "gzip" });
    assertEquals(response.headers.get("content-encoding"), null);
    assertEquals(response.headers.get("vary"), null);
    await response.body?.cancel();
  }
});

Deno.test("sets cache lifetimes for assets but not for pages", async () => {
  const expected: ReadonlyArray<readonly [string, string | null]> = [
    ["/site.css", "public, max-age=3600"],
    ["/site.js", "public, max-age=3600"],
    ["/fonts/bricolage-grotesque-latin.woff2", "public, max-age=2592000"],
    ["/", null],
    ["/effective-spec.html", null],
  ];
  for (const [path, cacheControl] of expected) {
    const response = await get(path);
    assertEquals(response.headers.get("cache-control"), cacheControl, path);
    assertEquals(response.headers.get("x-content-type-options"), "nosniff");
    await response.body?.cancel();
  }
});

Deno.test("passes a not-modified response through without a body", async () => {
  const first = await get("/site.css");
  await first.body?.cancel();
  const response = await get("/site.css", {
    "accept-encoding": "gzip",
    "if-none-match": first.headers.get("etag")!,
  });
  assertEquals(response.status, 304);
  assertEquals(response.headers.get("content-encoding"), null);
});

Deno.test("does not cache a missing file", async () => {
  const response = await get("/missing.css");
  assertEquals(response.status, 404);
  assertEquals(response.headers.get("cache-control"), null);
  await response.body?.cancel();
});

Deno.test("sets security headers on every response", async () => {
  for (const path of ["/", "/site.css", "/robots.txt", "/missing.css"]) {
    const response = await get(path);
    assertEquals(response.headers.get("x-frame-options"), "DENY", path);
    assertEquals(
      response.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin",
    );
    assertEquals(
      response.headers.get("permissions-policy"),
      "camera=(), microphone=(), geolocation=()",
    );
    await response.body?.cancel();
  }
});

Deno.test("serves the sitemap as gzipped XML", async () => {
  const response = await get("/sitemap.xml", { "accept-encoding": "gzip" });
  assertEquals(response.headers.get("content-type"), "application/xml");
  assertEquals(response.headers.get("content-encoding"), "gzip");
  assertEquals(
    await decompress(response),
    await Deno.readTextFile("public/sitemap.xml"),
  );
});
