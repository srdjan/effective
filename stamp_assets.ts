import config from "./deno.json" with { type: "json" };

// Assets have a one-hour cache lifetime, so each release needs new asset URLs.
const PAGES = ["public/index.html", "public/effective-spec.html"];
const ASSET_LINK = /(href="site\.css|src="site\.js)(\?v=[^"]*)?"/g;

export const stampAssets = (html: string, version: string): string =>
  html.replace(ASSET_LINK, (_match, link: string) => `${link}?v=${version}"`);

if (import.meta.main) {
  for (const page of PAGES) {
    const html = await Deno.readTextFile(page);
    await Deno.writeTextFile(page, stampAssets(html, config.version));
  }
}
