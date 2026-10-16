# Plan: Effective / Effect-TS tabs for every Effective code example

Status: validated (Fable review, 14 findings, all resolved below). The user did not answer the scope questions in time; the recommended options apply.
Date: 2026-10-16.

## Goal

Each Effective code example on both pages shows two tabs: "Effective" and "Effect-TS".
The Effect-TS tab shows a manual translation into Effect 4 code.
Every translation passes a strict type check against `effect@4.0.5`.
The check runs from one Deno task and lives in the repository.

## Decisions

- D1 (scope): all Effective blocks on `public/index.html` (14 figures plus the contract explorer) and `public/effective-spec.html` (13 figures). Blocks with `language-text` get no tab.
- D2 (layout): the eight existing Effect-TS translations move into tabs. Six are side-by-side `.pair` divs. Two are standalone target figures: the shared Users declarations and the payment target. The `.pair` pattern is removed.
- D3 (checking): a type-check harness in `typecheck/`, run by `deno task typecheck`. The README claim "they pass strict TypeScript checks against Effect 4.0.5" stays true for every Effect-TS panel.

## Environment facts

- Deno 2.9.7 (TypeScript 6.0.3). `effect@4.0.5` is the latest npm release.
- A prototype passed: the six users-chain panels plus a provider prelude in one file, and the payment panel in another, pass `deno check` under strict settings in 1.3 s. A deliberate type error is caught.
- `deno check --config typecheck/deno.json FILE` applies that config's import map to files outside `typecheck/`, so units in a temp directory resolve `effect`.
- In this shell, `curl` is an alias for `curlie`; use `command curl`. Use `command rm`, `command cp`, `command mv`.

## Ground truth for translations

- Translation rules: `public/effective-spec.html`, section `#ir` ("Typed IR and backends"):
  - Effectful functions return `Effect.Effect<A, E, R>`. `R` groups requirements by service (`uses Users.find | Users.save` gives `Users`).
  - Pure functions return ordinary values. Effectful exports return Effect even when E and R are empty.
  - Records, errors, and brands become Schema declarations. Options become `Option`. Providers become `Layer`.
  - Deferred control (`retry`, `provide`) stays deferred: wrap with `Effect.suspend`.
- House style: the eight existing translations in `public/index.html` (figures with `class="code target"`).
- Construct table (use these mappings everywhere):

| Effective | Effect-TS |
| --- | --- |
| `int` | `number` (in Schema: the `Int` filter from the payment panel when the record is a Schema) |
| `T[]` | `ReadonlyArray<T>` |
| `Brand<string>` named `UserId` | `Schema.String.pipe(Schema.brand("UserId"))` and `type UserId = typeof UserId.Type` |
| `unbrand(x)` | `x` (the brand is a subtype of string) |
| `nickname?: string` in a record | `Schema.optionalKey(Schema.String)` |
| `match` on an optional field | `Option.fromUndefinedOr(...)` then `Option.match` (`fromNullable` does not exist in effect 4.0.5) |
| `Option<T>` | `Option.Option<T>` |
| `if (c) { a } else { b }` | `c ? a : b` |
| `match` on a tagged record union | `switch` on the tag, or a ternary for two cases |
| string literal union | `Schema.Literals([...])` |
| record union | `Schema.Union([...])` |
| `xs \|> filter(f) \|> map(g)` | `xs.filter(f).map(g)` |
| `xs \|> fold(init, f)` | `xs.reduce(f, init)` |
| `value \|> f(a, b)` (general) | `f(value, a, b)` |
| `error E = { ... }` | `class E extends Schema.TaggedError<E>()("E", { ... }) {}` |
| `service S { m(...): T fails E }` | `class S extends Context.Service<S, { readonly m: (...) => Effect.Effect<T, E> }>()("S") {}` |
| method returning `void` | `Effect.Effect<void, E>` |
| `fail(E({ ... }))` | `Effect.fail(new E({ ... }))` |
| `try { ... } catch { E(error) => v }` | `Effect.catchTag("E", (error) => Effect.succeed(v))` |
| `const job = () => effectfulCall()` | a thunk that returns the Effect |
| `retry(job, { times: n })` | `Effect.retry(Effect.suspend(job), { times: n })` |
| `provide(Live, () => e)` | `Effect.provide(Effect.suspend(() => e), Live)` |
| import from `"./users.eff"` | import from `"./users.js"` |
| import from `"host:providers"` | import from `"./users-live.js"` (same as the existing provider panel and its prose) |

## Markup (both pages)

Each Effective example becomes one figure:

```html
<figure data-ui class="code" data-tabs data-check="UNIT" data-check-requires="ID ...">
  <figcaption>Caption</figcaption>
  <div class="code-panel" data-tab="Effective"><pre tabindex="0"><code class="language-effective">...</code></pre></div>
  <div class="code-panel" data-tab="Effect-TS" data-check-id="ID"><pre tabindex="0"><code class="language-typescript">...</code></pre></div>
</figure>
```

- `.pair` divs: merge the two figures into one; delete the `.pair` div.
- Standalone targets (shared Users declarations, index source near line 71 and target near line 87; payment, source near line 250 and target near line 305): move the target `<pre>` into the source figure as the second panel and delete the target figure. The paragraphs between them stay in place. Re-read the paragraph that followed each moved target ("The TypeScript target represents...", "The target uses Effect.gen...") and adjust its wording so it does not refer to a figure above it.
- Keep `data-ui` (a marker for the vendored taste-skill linter). Remove the `source`, `target`, and `neutral`-pair classes from merged figures.
- Captions: drop "Effective " / "Illustrative Effect-TS " prefixes. Keep a dependency phrase when the Effect-TS needs earlier declarations, for example "Lookup using chapter 4 declarations". Spec captions that are only "Effective" become a short description.
- HTML-escape code exactly like the existing blocks: `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#x27;`.
- Every Effective `<code>` has `class="language-effective"`, including the explorer `<code>` (add the class there).

## Behavior (public/site.js, public/site.css)

- New `setupCodeTabs()` for each `figure[data-tabs]`, called before `setupEntryMotion()`:
  - Insert `<div role="tablist" aria-labelledby="CAPTION_ID">` after the figcaption. Give the figcaption an id when it has none.
  - For each panel, insert `<button type="button" role="tab">` with text from `data-tab`, `id`, `aria-controls`, `aria-selected`, and roving `tabindex` (active `0`, inactive `-1`).
  - Panel ids: `tabs-N-effective` and `tabs-N-effect-ts`, where N is the figure index in document order. Button ids: `tabs-N-effective-tab` and `tabs-N-effect-ts-tab`. They must not collide with `contract-source` or `contract-effect`.
  - Panels get `role="tabpanel"` and `aria-labelledby` pointing to their button. The `pre` keeps `tabindex="0"`.
  - Effective is active by default. Inactive panels get `hidden`.
  - Keyboard: Left/Right move between tabs (wrapping), Home/End go to first/last; focus moves and activates the tab (automatic activation).
  - Each figure switches on its own; no sync across figures.
  - Add the class `tabs-ready` to the figure.
- CSS:
  - Without JS: both panels show stacked, each with a small label from `.code-panel::before { content: attr(data-tab) }`. `.tabs-ready .code-panel::before { display: none }`.
  - Tab buttons: `background: transparent` (the global `button` rule only sets `border: 0`), `color: var(--code-ink)`, `font: inherit` at `var(--small)`, min-height 44px; active tab marked with an `--accent` bar or underline; inactive tabs use `--code-comment`. The global `:focus-visible` outline covers focus.
  - Print: `[role="tablist"] { display: none }`, `.code-panel[hidden] { display: block !important }` (more specific than the existing `[hidden] { display: none !important }`), and `.tabs-ready .code-panel::before { display: block }` so labels show.
  - Remove the now-unused `.pair` rules: base rules (about lines 133-135), the 1150px rule (about 178), print rules (about 297-298). In the 520px block, change `.code pre, .pair .code pre { ... }` to `.code pre { ... }`; do not delete the line.

## Contract explorer (index.html form and site.js `functions`)

- The explorer figure gets the same two panels. Put `id="contract-effect"` on the Effect-TS `pre` (mirrors `#contract-source > code`). Add the element to the null guard in `setupContractExplorer`.
- Figure attributes: `data-check="explorer-getUser" data-check-requires="users-declarations"`; the Effect-TS panel has `data-check-id="explorer-getUser"`. It must not join the `users` unit (it would declare `getUser` twice).
- Every entry in `functions` gets an `effect` template literal. Part A writes all four (getUser, rename, displayName, activeNames); they are near-copies of the checked book panels (lookup, update, recovery, collection). No backticks and no `${` inside these literals.
- `selectFunction` sets and highlights both panels.
- The static HTML Effect-TS panel holds the getUser translation and must equal `functions.getUser.effect`.
- The tab buttons have `type="button"`, so they never submit the form.

## Type-check harness (typecheck/)

- `typecheck/deno.json`: `compilerOptions` `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`; `imports` `{ "effect": "npm:effect@4.0.5" }`. Part A commits the generated `typecheck/deno.lock`.
- `typecheck/check.ts`:
  1. Resolve paths from `import.meta.url`, so it runs from any cwd.
  2. Read both HTML files and `public/site.js`. Decode entities with a hand-written decoder (`&lt; &gt; &amp; &quot; &#x27;`, and `&#39;`). Do not import `@std/html` or any other module that would change the root `deno.json`.
  3. Collect Effect-TS panels with `data-check` (unit), `data-check-id` (id), and `data-check-requires` (explicit, ordered, non-transitive list of ids). Ids are global across both pages and site.js. Error on unknown or duplicate ids. Names match `[a-z0-9-]+`.
  4. Collect explorer `effect` literals from site.js with a regex over `name: { source: \`...\`, ... effect: \`...\` }`. Units: `explorer-getUser` requires `users-declarations`; `explorer-rename` and `explorer-displayName` require `users-declarations explorer-getUser`; `explorer-activeNames` requires `users-declarations`. Keep this mapping in one small table in check.ts.
  5. Build one file per unit, `UNIT.ts`: required snippets (each once, in the listed order), then the unit's panels in document order, then `typecheck/preludes/UNIT.ts` if it exists. Join snippets with a blank line.
  6. Imports: over the full concatenation, collect every `import { ... } from "effect"` (multi-line aware, regex like `/^import\s*\{[^}]*\}\s*from\s*"[^"]+"\s*;?\s*$/gm`), merge the names into one import at the top, and remove every other import statement. Append `export {}` so every unit is a module.
  7. Preludes may contain only `import ... from "effect"`, `declare`, and `type` statements. A prelude never copies a declaration that a page displays.
  8. Write units to a fresh `Deno.makeTempDir()` directory. Run one `Deno.execPath() check --config <abs typecheck/deno.json> <files>` subprocess. On failure print its output (paths name the unit) and exit non-zero.
  9. Flags: `--page index|spec|all` (default `all`) builds units only from that page (ids still load from all pages). `--strict` also fails when any Effective figure has no Effect-TS panel; without `--strict` it prints the missing list.
- `deno.json` task: `"typecheck": "deno run --allow-read --allow-write --allow-run=deno typecheck/check.ts --strict"`. Parts use `deno run ... typecheck/check.ts --page X` during work.

## Panel ids Part A assigns (B and C may reference them)

`users-declarations`, `users-lookup`, `users-update`, `users-collection`, `users-recovery`, `users-retry`, `users-provider` (all `data-check="users"`), `payment` (`data-check="payment"`), `explorer-getUser`.

The provider panel needs `Layer` and `UsersLive`: `typecheck/preludes/users.ts` holds `import { Layer } from "effect"` and `declare const UsersLive: Layer.Layer<Users>`.

## Special cases

- Spec block 13 (`#diagnostics`) is an invalid program. Its Effect-TS panel shows exactly this shape, and the figure requires the spec Users panel so `getUser` exists:

  ```ts
  const broken = (id: string): Effect.Effect<User, never, Users> =>
    // @ts-expect-error Effect-TS rejects the same contract: getUser can fail.
    getUser(id)
  ```

- Spec block 7 (`value |> transform`) is a syntax schema: `transform(value)` and `transform(value, a, b)`. Its prelude declares `value`, `transform`, `a`, `b`.
- Spec dependency graph (from the spec inventory): 1 provides `log`, required by 4. 2 provides `User`, `Status`, `UserId`, `Profile`, required by 3, 5, 8. 5 provides `UserMissing`, `StoreUnavailable`, `Users`, `getUser`, required by 10, 12, 13. 6 is standalone with its own `User`. 7 is standalone with a prelude. 9 is standalone (`Shape`). 11 requires `payment` plus a prelude with `declare const id: OrderId` and `declare const AppLive: Layer.Layer<Orders | Payments>`. 12 requires 2, 5, 10 plus a prelude declaring `UsersLive`.

## Prose and counts

- Wording that becomes stale (do not edit the semantic phrase "from left to right"):
  - index.html around line 11 ("Each paired example"), 121 ("Each pair shows"), 123 ("These isolated comparisons"), 247 (users-live.js prose; keep consistent with the import mapping), 412 ("Eight target examples pass strict TypeScript checks").
  - effective-spec.html around lines 10, 262 ("eight illustrative Effect-TS targets"), 263.
- Prose and captions follow ASD-STE100: sentences of at most 25 words, no em dashes, no emojis.
- Do not change any Effective source block.
- `public/effective-validation.txt` and README: the orchestrator updates them at the end (counts depend on B and C).
- Implementers do not rebuild `public/effective.zip`, do not edit the root `deno.lock`, and do not commit.

## Verification

1. Part A: `deno run ... typecheck/check.ts` passes for all present units; the missing list is exactly the 19 blocks that B and C translate (6 book blocks, 13 spec blocks). A negative control (break one panel, confirm failure naming the unit, restore) passes.
2. Parts B and C: `typecheck/check.ts --page index` or `--page spec` passes. End: the orchestrator runs `deno task typecheck` (strict) over everything.
3. `deno task test`, `deno fmt --check main.ts main_test.ts typecheck/`, `deno lint public/site.js typecheck/` pass.
4. Browser (start `deno task dev`, port 8787; Playwright): tabs switch by click and arrow keys; `aria-selected`, roving `tabindex`, and `hidden` stay consistent; the explorer updates both panels for all four functions; the explorer tabs do not submit the form; no console errors; print emulation shows both panels with labels and no tablist.

## Work split

- Part A (first): harness, tab markup and behavior, conversion of the eight existing translations, explorer panel and all four explorer `effect` strings, CSS, stale prose in index.html and effective-spec.html.
- Part B (after A, parallel with C): new translations for the six remaining book blocks (`index.html`, book preludes).
- Part C (after A, parallel with B): new translations for the 13 spec blocks (`effective-spec.html`, spec preludes).
- B and C never edit the same file and each runs the harness with its `--page` filter.
