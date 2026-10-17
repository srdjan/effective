import { assertEquals, assertStringIncludes } from "@std/assert";
import config from "./deno.json" with { type: "json" };
import { stampAssets } from "./stamp_assets.ts";

Deno.test("replaces or adds the version on asset links", () => {
  assertEquals(
    stampAssets(
      '<link rel="stylesheet" href="site.css?v=0.1.0"><script src="site.js" defer>',
      "2.0.0",
    ),
    '<link rel="stylesheet" href="site.css?v=2.0.0"><script src="site.js?v=2.0.0" defer>',
  );
});

Deno.test("pages load assets with the deno.json version", async () => {
  for (const page of ["public/index.html", "public/effective-spec.html"]) {
    const html = await Deno.readTextFile(page);
    assertStringIncludes(html, `href="site.css?v=${config.version}"`, page);
    assertStringIncludes(html, `src="site.js?v=${config.version}"`, page);
  }
});
