---
title: The site type check does not check the Effektive tabs, so compile them with effektive-lang
date: 2026-10-17
category: workflow-issues
module: typecheck harness and Effektive figures
problem_type: workflow_issue
component: documentation
related_components: [tooling]
severity: medium
applies_when:
  - The effektive-lang compiler adds or changes a language rule
  - An Effektive figure, exercise, or example file on the site changes
  - A figure gets a new data-check-requires entry
tags: [typecheck, effektive-tabs, data-check-requires, data-check-id, effektive-lang, spec-migration, r1]
---

# The site type check does not check the Effektive tabs, so compile them with effektive-lang

## Context

`deno task typecheck` checks only the Effect-TS tabs. The harness reads each panel whose code has `class="language-typescript"` (`typecheck/check.ts:110`). For an Effektive block, it only checks that the figure has an Effect-TS panel (`typecheck/check.ts:157`). So an Effektive tab that the compiler rejects still passes `deno task typecheck` and `deno task test`.

The harness was built on 2026-10-16, when no compiler could check the Effektive side (session history). The compiler now exists in `/Users/srdjans/Code/effektive-lang`.

For draft 0.2, the compiler added three rules. R1 allows primitive types only inside type or error declarations (`declaration/013`). The other rules add nominal records (`Brand<{ ... }>`) and operators on numeric brands. Before the migration, 66 primitives in signatures broke R1, in the 30 Effektive blocks of both pages and in the 5 example files. The site check passed on all of them.

## Guidance

After a compiler rule change, check the Effektive side with the compiler itself, in two passes.

1. Parse each Effektive block with the compiler parser. Extract each `<code class="language-effektive">` block from `public/index.html` and `public/effektive-spec.html`. Unescape the HTML entities, and include `public/effektive-examples/*.eff`. Call `parse("block.eff", code)` from `/Users/srdjans/Code/effektive-lang/src/core/parse.ts`.

   Walk the tree for the rule. For R1, report each `NamedType` node named `string`, `int`, `number`, or `boolean`, and each `LiteralType` node, that has no `TypeDecl` or `ErrorDecl` ancestor. The fragments in the figures `spec-pipe` and `spec-deferred` are not modules, so they give syntax findings. Those findings are expected.
2. Build each figure with the figures that it requires. For each `data-check` unit, collect the Effektive blocks of its `data-check-requires` chain in dependency order. Add the own blocks of the unit last.

   Write them to one `.eff` file in a copy of `/Users/srdjans/Code/effektive-lang/fixtures/examples`. The copy needs `effektive.json`, the `host` directory, and `users-live.ts`. Run `deno task effektive build <dir> --tsc` from effektive-lang. Expect 0 diagnostics. Only `spec-diagnostics` must give its documented `failure-contract/001`.

Also look for Effektive code outside `language-effektive` blocks. An exercise answer in a plain `<pre><code>` escapes both the site check and pass 1. On draft 0.2, the answer `const rename = (user: User, name: string): User => ...` in `index.html` broke R1 until a review found it.

## Why This Matters

The pages are the language reference. A stale Effektive example teaches a program that the compiler rejects. The Effect-TS check cannot find this fault, because the Effect-TS translation of a rejected program can still type-check. On draft 0.2, the Effect-TS tabs used `id: string` in signatures, and `tsc` accepted them.

## When to Apply

Apply this after each effektive-lang change that adds a diagnostic or changes a type rule. Apply it before each commit that edits an Effektive figure.

## Examples

Three faults came up in the draft 0.2 migration. Each one fails silently or with an unclear message.

- `data-check-requires` resolves only against a panel `data-check-id`, not against a figure `data-check` name. The harness gives `unit "book-blocks" requires unknown id "book-contracts"` (`typecheck/check.ts:282`) and checks no unit. To fix it, add `data-check-id="book-contracts"` to the Effect-TS panel of the required figure.
- Some units import `"./users.eff"`, for example `spec-main` and `book-modules`. They must compile alone, beside the example `users.eff`. If you prepend their required figures, the unit probably declares `User` twice. This was not tested.
- The `users` unit of the book contains the service `Users` and a `provide(UsersLive, ...)` call. The host interface file of the examples imports `Users` from the module `../users.eff`. If the whole unit is written as `users.eff`, the build gives `module/003: import cycle`. Move the provider block to a second module, `app.eff`, that imports from `./users.eff`.

For a new rule, keep the alias style of the migrated examples. Signatures name a declared type, such as `type Name = string`. The Effect-TS tab uses a plain TypeScript alias, `type Name = string`. The construct table in `docs/plans/2026-10-16-effect-ts-tabs.md` lists these mappings.
