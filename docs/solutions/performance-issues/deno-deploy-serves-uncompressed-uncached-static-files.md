---
title: Deno Deploy serves serveDir files without compression or cache lifetime
date: 2026-10-16
category: performance-issues
module: main.ts static file server
problem_type: performance_issue
component: infrastructure
related_components: [frontend]
symptoms:
  - Production responses for HTML, CSS, and JS have no content-encoding header
  - Production responses have no cache-control header
  - Lighthouse flags text compression, cache lifetime, and render-blocking site.css
  - /favicon.ico returns 404 on every page load
root_cause: incomplete_setup
resolution_type: code_fix
severity: low
retire_when: "Deno Deploy or @std/http serveDir starts to compress responses itself; check with command curl -sI -H 'Accept-Encoding: gzip' against the production site and look for content-encoding before the main.ts gzip step runs"
tags: [deno-deploy, servedir, gzip, cache-control, lighthouse, lcp, font-preload, render-blocking]
---

# Deno Deploy serves serveDir files without compression or cache lifetime

## Problem

`serveDir` from `@std/http` sends files uncompressed and without `cache-control`. Deno Deploy does not add either header. The site was already fast, but each page sent about 54 KiB more than necessary.

## Symptoms

- `command curl -sI -H 'Accept-Encoding: gzip, br'` against the production site showed no `content-encoding` for any file. The book page came back at its full size, 43,167 bytes at that time.
- No response had `cache-control`. Only `etag` was present.
- `/favicon.ico` returned 404 on every page load, because the pages declared no icon.
- Lighthouse 12.8.2 (mobile, simulated throttling) flagged text compression (54 KiB), cache lifetime (106 KiB), and `site.css` as render-blocking ("Est savings of 680 ms").

## What Didn't Work

Each experiment ran in a throwaway copy of the site. Lighthouse ran in mobile mode three times on the book page, and the medians are below. Baseline: FCP 1.65 s, LCP 1.65 s, CLS 0.015, 149 KiB.

- **Font preload** (`<link rel="preload" as="font" crossorigin>` for the woff2). FCP improved to 1.11 s and CLS dropped to 0. But LCP got worse: 1.80 s alone, and 1.50 s with gzip against 1.35 s for gzip alone. The preloaded 77 KB font competes with the render-blocking CSS for bandwidth. Do not add the preload unless a new measurement shows an LCP gain.
- **Inlining `site.css` into the HTML** to remove the render-blocking request. With gzip, LCP was 1.50 s, which is worse than 1.35 s for the external file. The 680 ms saving that Lighthouse estimated did not occur. The external file can also be cached across both pages.
- **A direct LCP fix on the hero heading** does not apply. Chrome reports the small brand link `a.brand` as the LCP element, not the large hero `h1`. The hero animates in from opacity 0 (`public/site.css:272` and the keyframe at `:276`), so Chrome does not count the hero as an LCP candidate.

## Solution

`main.ts` gzips text responses and sets cache lifetimes:

- `COMPRESSIBLE_TYPE` (`main.ts:7`) selects text, JSON, and SVG. Fonts and `effective.zip` are already compressed, so `main.ts` leaves them unchanged.
- `acceptsGzip` (`main.ts:15`) honors `gzip;q=0`.
- Only a full 200 response with a body is compressed (`main.ts:57`). Range responses (206) and 304 responses pass through unchanged. `vary: accept-encoding` is set on every compressible response.
- `CACHE_LIFETIMES` (`main.ts:10`) gives the font 30 days and CSS and JS one hour. HTML gets no `max-age`, so a deploy reaches readers at once. After a deploy, a reader can see new HTML with the old CSS for up to one hour.
- The fix uses gzip only. Deno 2.9.7 also accepts `new CompressionStream("brotli")` (the name `"br"` throws). With `CompressionStream`, brotli made the book page about 0.7 KB smaller than gzip (1.3 KB across HTML, CSS, and JS), in a local measurement. The Deno Deploy runtime was not checked for brotli support.
- Deno's types require the body to be a `ReadableStream<Uint8Array<ArrayBuffer>>`.

Both pages also declare `<link rel="icon" href="data:,">`, which removes the favicon request.

Result (same Lighthouse setup): score 1.0, LCP 1.35 s, 95 KiB, and no favicon request.

## Why This Works

The page is small, and its critical path is HTML, then CSS, then the font. On a slow connection, the byte count of that path sets LCP. gzip cuts the current HTML from 43,153 to 11,461 bytes and the CSS from 18,683 to 4,536. Changing the request order (preload) or the request count (inlining) did not help, because those changes did not remove bytes from the path.

## Prevention

- `deno task test` (`deno.json:8`) runs `main_test.ts`. The tests check gzip, the `q=0` case, plain-text types, cache lifetimes, the 304 pass-through, and missing files. Four of the seven tests fail against the old `main.ts`.
- Before you act on a Lighthouse savings estimate, test the change in a copy of the site and compare medians of three runs. The estimates for render-blocking CSS and font loading were wrong for this site.
- Check production headers with `command curl`. In this environment, `curl` is an alias for `curlie`, which changes the request and returns 405 (auto memory [claude]).

## Related Issues

- No related docs or issues. `gh` was not logged in, so the GitHub issue search did not run.
