# UX audit and fixes - 2026-10-17

## Context

- Target: the mini book (`public/index.html`) and the specification (`public/effektive-spec.html`).
- Primary user: a TypeScript developer who evaluates Effektive. The task is to read the chapters, compare each Effektive example with its Effect-TS output, and open the source files.
- Evidence: the running site at 1440x900 and 390x844 in Playwright, and the source in `public/site.js`, `public/site.css`, and both pages.
- Limits: no analytics, no user research, and no test on a real phone, Windows, or a screen reader. Severity ratings are expert assessments, not measured outcomes.

## Measured facts

- Book page height: 23,117 px at 1440 px wide. The book has 9 sections, 17 code figures, 15 tabbed figures, and 7 exercises.
- Spec page height: 29,871 px. The spec has 18 sections, 19 code figures, and 15 tabbed figures.
- At 390x844, the mobile chapters menu is 9,532 px above the reader when the reader is in chapter 5. The menu is not sticky.
- At 390 px, the sticky top bar is 102 px high, which is 12 percent of the viewport.
- Section navigation links read "Previous section" and "Next section" on all 27 sections.
- No code figure has a copy action. No heading has a permalink.
- `.eff` links open the source drawer. `typed-ir.ts`, `log.ir.json`, `effektive-validation.txt`, and `log.lft` open plain text pages.

## Heuristic findings (Nielsen H1-H10, severity 0-4)

| ID | Problem | Heuristic | Severity | Action |
| --- | --- | --- | --- | --- |
| U1 | On narrow screens the chapters menu is reachable only at the start of the reader. | H6, H3 | 3 | Fix |
| U2 | A tab choice applies to one figure only. A reader who wants Effect-TS must switch 15 figures on each page. | H7 | 2 | Fix |
| U3 | Code figures have no copy action. | H7 | 2 | Fix |
| U4 | Source links behave in two ways: `.eff` opens the drawer, other source files open a raw page. | H4 | 2 | Fix |
| U5 | Section links do not name the previous or next section. | H6 | 2 | Fix |
| U6 | On narrow screens the top bar wraps to two rows. The forced wrap was for three links, and only two links remain. | H8 | 1 | Fix |
| U7 | "Read the book" and "Read the reference" jump within the page but show the outward arrow. | H4 | 1 | Fix |
| U8 | The drawer shows no feedback while a source file loads. | H1 | 1 | Fix |
| U9 | At 1440 px the explorer submit button is about 1,000 px from the input. | H7 | 1 | Defer |
| U10 | Headings have no visible permalink to share a section. | H7 | 1 | Defer |

## Flow critique (ux-expert)

R1: a returning reader has no resume point. The reader must remember the chapter, open or scroll to the contents, and pick it: three steps plus recall. The fix is one recognizable "Continue" link (Fogg ability: less effort to resume). Step count goes from 3 to 1. U2 persistence also helps the second visit: the tab choice is kept.

## Implementation plan

All work is in `public/site.js`, `public/site.css`, `public/index.html`, and `public/effektive-spec.html`. Follow the existing style: one IIFE, `const` arrow functions, `setupX` functions called at the end, compact one-line CSS rules. Every feature is progressive enhancement: without JavaScript the pages work as before. Respect `prefers-reduced-motion`. Wrap every `localStorage` access in `try`/`catch`, because storage can throw in private modes.

### P1 (U1): sticky chapters menu with the current chapter

- CSS, inside `@media (max-width: 800px)`: make `.contents-menu` sticky. Use `position: sticky; top: var(--topbar-height, 76px); z-index: 15;`. Give the open menu `max-height: calc(100svh - var(--topbar-height, 76px)); overflow-y: auto;`.
- JS: set `--topbar-height` on `document.documentElement` from the measured `.topbar` height. Update it on `resize`.
- JS, in `setupContents`: when the current section changes, write the chapter name into the summary of `details.contents-menu`. Keep the original summary text in a visually hidden prefix, for example "Chapters of the mini book: " + current link text. The visible text is the current chapter name, for example "Chapter: Lookup and update". Keep the summary on one line with ellipsis.
- Update `html { scroll-padding-top }` and `.section { scroll-margin-top }` for narrow screens, so an anchor jump does not hide the heading under the sticky bar and menu. Use the measured heights.

### P2 (U2 + R1 persistence): synced and remembered tabs

- In `setupCodeTabs`, when a tab is activated by a user (click or arrow keys), activate the tab with the same label in every other tabbed figure on the page. Do not move focus in the other figures.
- Keep the scroll position of the figure that the user clicked. Other figures above it can change height when their panel changes. Read the clicked figure's `getBoundingClientRect().top` before the change and correct `scrollBy` after it.
- Store the label in `localStorage` under `effektive.tab`. On load, activate the stored label in each figure that has it. Default to the first tab when nothing is stored.

### P3 (U3): copy button on code figures

- In JS, add a `<button type="button" class="copy-code">Copy</button>` to every `figure.code` figcaption, and to the drawer figcaption before Close. Do not change the static HTML, because `typecheck/check.ts` parses figcaptions in the HTML files.
- On click, copy the `textContent` of the visible `pre code` in that figure with `navigator.clipboard.writeText`. Change the label to "Copied" for 1.6 s, then back. On failure, change it to "Copy failed" for 1.6 s. Announce through `aria-live="polite"` on the button label or a visually hidden status.
- Skip the copy button when `navigator.clipboard` is missing.
- Group the figcaption actions on the right. A figcaption can already contain a link ("View Effektive source"). Put the link and the button in one flex group.
- Style the button like the drawer Close button but quieter: transparent, `min-height: 44px` for touch, `--code-comment` text, `--code-ink` on hover and focus.

### P4 (U4 + U8): drawer for all source files

- Extend the drawer selector to `.eff`, `.ts`, `.json`, `.lft`, and `.txt` links. Exclude `fonts/` links (the font license) and any link with a `download` attribute.
- Highlight `.eff`, `.ts`, and `.json`. Do not highlight `.txt` or `.lft`, because the keyword list colors ordinary prose words.
- While a file loads, set `aria-busy="true"` on the clicked link and show `cursor: progress`. Clear it when the load ends.

### P5 (U5): named section links

- In both HTML files, change each section link label to name its target. Use "Previous: <heading>" and "Next: <heading>". Keep "Back to start" for the first section. Take each heading text from the `h2` of the target section. Make this change with a one-off script, and do not commit the script. Keep the `href` values.

### P6 (U6, U7): top bar and arrows

- In `@media (max-width: 520px)`: remove the forced `width: 100%` and `justify-content: space-between` on `.toplinks`, and let the bar wrap only when it must. At 390 px the brand and both links must fit on one row. At 320 px a wrap is acceptable.
- Change the arrow of in-page buttons ("Read the book", "Read the reference") from `↗` to `↓`, with the text-presentation selector `︎` if the glyph is emoji-capable. `↓` (U+2193) is not emoji-capable, so it needs no selector. Keep `↗` on "Read the specification", which opens another page.

### P7 (R1): continue reading

- Store the current section id under `effektive.section.<page>` when the current section changes, where `<page>` is `book` or `spec` from `body.book-page` or `body.spec-page`. Throttle writes to one per second.
- On load, when the URL has no hash and a stored id exists that is not the first section, add a link to the hero actions: "Continue: <chapter name>" with `href="#<id>"`. On the book page put it after "Read the book". On the spec page put it after "Read the reference". Style it as the secondary button style of its hero.

### Deferred

- U9: the explorer input layout is part of the hero redesign. Changing it needs a design decision.
- U10: heading permalinks are useful, but no reader task in this audit needs them.

## Verification

1. `deno task test`, `deno lint public/site.js`, `deno fmt --check public/site.js`, and `deno task typecheck` pass.
2. Playwright at 1440x900 and 390x844 on both pages:
   - U1: scroll to chapter 5 at 390 px. The chapters menu is visible under the top bar and shows the chapter name. Open it, click a chapter, the menu closes, and the heading is not hidden.
   - U2: switch one figure to Effect-TS. All tabbed figures show Effect-TS. The clicked figure does not move. Reload: Effect-TS stays selected.
   - U3: click Copy on a code figure and in the drawer. The clipboard holds the visible panel text.
   - U4: open `typed-ir.ts`, `log.ir.json`, and `effektive-validation.txt` from the contents. Each opens in the drawer. The `.txt` file has no keyword colors.
   - U5: section links name their targets.
   - U6: at 390 px the top bar is one row.
   - R1: read to chapter 5, reload without a hash, and see "Continue: <chapter>". Click it and land on chapter 5.
3. No console errors.
4. Bump the version in `deno.json` and run `deno task stamp`, because `site.css` and `site.js` change.

## Validation resolutions (Fable review, 2026-10-17)

These resolutions override the plan text above where they differ.

- B1 (accepted): build the drawer Copy button into the drawer `innerHTML` at creation. Give Close `class="close-drawer"` and bind it with `drawer.querySelector(".close-drawer")`. The copy setup for static figures runs before `setupSourceDrawer`, so it never touches the drawer figure; the drawer binds its own Copy button.
- B2 (accepted): read the stored section id before `setupContents` runs its first `setCurrentSection`. Write only when the current section changes after that first call: track `previous`, and skip the write while `previous === null`. Also write on `pagehide`. No throttle.
- B3 (accepted): correct with `globalThis.scrollBy({ top: delta, left: 0, behavior: "instant" })`. Measure after the change, then correct. If Chromium shows a double correction, set `document.documentElement.style.overflowAnchor = "none"` during the sync and restore it after.
- B4 (resolved differently): HEAD is commit 0892496, which sets `deno.json` to 0.4.0 without a stamp, so `deno task test` is red at HEAD. The pages never used 0.4.0, so do not bump again. Run `deno task stamp` once at the end; it writes `?v=0.4.0`. This makes the test green.
- M1 (accepted): keep the in-flow height of the menu constant. The open nav is an overlay: `.contents-menu[open] .contents { position: absolute; inset: 100% 0 auto; background: var(--surface); max-height: calc(100svh - var(--topbar-height, 76px) - 60px); overflow-y: auto; padding-inline: var(--gutter); }`. The sticky `details` is the containing block. Remove the `max-height` and `overflow-y` from the `details` itself.
- M2 (accepted): at or below 800 px set `.contents-menu { padding-block: 4px; }` so the menu is about 52 px.
- M3 (accepted): do not change scroll offsets first. Verify that a chapter jump at 390 px and 700 px shows the heading below the chrome. Change offsets only if a heading hides, with `calc(var(--topbar-height, 76px) + 68px)`.
- M4 (accepted): JS wraps the spec hero buttons in `<div class="reference-actions">` with `display: flex; flex-wrap: wrap; gap: 12px`. At or below 520 px the actions stack full width, like `.hero-actions`. The Continue link uses `class="button secondary-action continue-action"` on both pages.
- M5 (accepted): `.continue-action { white-space: normal; text-align: left; }`. The link content is `Continue: <chapter> <span aria-hidden="true">↓</span>`.
- M6 (accepted): JS wraps the leading text node of each figcaption in `<span class="code-title">`. The tablist `aria-labelledby` points at that span id. Each Copy button has `aria-describedby` with that span id. Run this wrapping before `setupCodeTabs`.
- M7 (accepted): one visually hidden `<p role="status" class="visually-hidden">` appended to `body`. Set its text to "Copied: <caption>" or "Copy failed". Clear the previous timeout on a second click. Give `.copy-code` a `min-width` so "Copied" does not shift the caption.
- M8 (accepted): move the Close ring to `.close-drawer`. `.copy-code` has no ring.
- M9 (accepted): copy from `figure.querySelector(".code-panel:not([hidden]) pre code") ?? figure.querySelector("pre code")`.
- M10 (accepted): add the `.visually-hidden` utility. Capture the original summary text, then call `summary.replaceChildren(hiddenPrefix, currentSpan)` once and update only `currentSpan.textContent`. The visible text is the current chapter name. Showing the first chapter before the reader reaches it is acceptable, because the menu is only visible inside the reader.
- M11 (accepted): set `--topbar-height` with a `ResizeObserver` on `.topbar`. Fall back to the `resize` event when `ResizeObserver` is missing.
- L1 (accepted): add a check: store Effect-TS, reload with `#lookup-update`, and confirm the heading sits below the chrome.
- L3 (accepted): `.section-nav a:last-child { text-align: right; }`.
- L4 (accepted): replace `↗` with `↓` in the two in-page hero buttons, with no variation selector. Add `.button[href^="#"]:hover span, .button[href^="#"]:focus-visible span { transform: translateY(3px); }` inside the existing hover media query, and reset it in the reduced-motion block. The chapter index arrow stays; it is deferred.
- L5 (accepted): add `a[aria-busy="true"] { cursor: progress; }`.
- L8 (accepted): grant clipboard permissions in Playwright, and reuse one browser context for reload checks.
