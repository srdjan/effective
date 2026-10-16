import { serveDir } from "@std/http/file-server";

// The standard media types map .ts to video/mp2t and do not know .eff or .lft.
const TEXT_EXTENSIONS = [".ts", ".eff", ".lft"];

// Neither serveDir nor Deno Deploy compresses responses or sets a cache lifetime.
const COMPRESSIBLE_TYPE = /^(text\/|application\/json|image\/svg\+xml)/;

// HTML has no max-age, so a new deploy reaches readers at once.
const CACHE_LIFETIMES: ReadonlyArray<readonly [RegExp, number]> = [
  [/^\/fonts\//, 60 * 60 * 24 * 30],
  [/\.(css|js)$/, 60 * 60],
];

const acceptsGzip = (header: string): boolean =>
  header.split(",").some((part) => {
    const [name, ...params] = part.split(";").map((value) => value.trim());
    const quality = params.find((param) => param.startsWith("q="));
    return name === "gzip" &&
      (quality === undefined || Number(quality.slice(2)) > 0);
  });

const gzip = (
  response: Response,
  body: ReadableStream<Uint8Array<ArrayBuffer>>,
): Response => {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.set("content-encoding", "gzip");
  return new Response(body.pipeThrough(new CompressionStream("gzip")), {
    status: response.status,
    headers,
  });
};

const server: Deno.ServeDefaultExport = {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const response = await serveDir(request, { fsRoot: "public", quiet: true });
    if (TEXT_EXTENSIONS.some((extension) => url.pathname.endsWith(extension))) {
      response.headers.set("content-type", "text/plain; charset=utf-8");
    }
    response.headers.set("x-content-type-options", "nosniff");

    const lifetime = CACHE_LIFETIMES.find(([pattern]) =>
      pattern.test(url.pathname)
    );
    if (response.ok && lifetime) {
      response.headers.set("cache-control", `public, max-age=${lifetime[1]}`);
    }

    const type = response.headers.get("content-type") ?? "";
    if (!COMPRESSIBLE_TYPE.test(type)) return response;
    response.headers.append("vary", "accept-encoding");
    // Only a full 200 body is compressed: 206 ranges and 304s pass through.
    if (
      response.status !== 200 || response.body === null ||
      !acceptsGzip(request.headers.get("accept-encoding") ?? "")
    ) {
      return response;
    }
    return gzip(response, response.body);
  },
};

export default server;
