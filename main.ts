import { serveDir } from "@std/http/file-server";

// The standard media types map .ts to video/mp2t and do not know .eff or .lft.
const TEXT_EXTENSIONS = [".ts", ".eff", ".lft"];
const HOME = "/effective-mini-book.html";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return Response.redirect(new URL(HOME, url), 302);
    }
    const response = await serveDir(request, { fsRoot: "public", quiet: true });
    if (TEXT_EXTENSIONS.some((extension) => url.pathname.endsWith(extension))) {
      response.headers.set("content-type", "text/plain; charset=utf-8");
    }
    response.headers.set("x-content-type-options", "nosniff");
    return response;
  },
} satisfies Deno.ServeDefaultExport;
