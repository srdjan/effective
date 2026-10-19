# Effective

Effective is a friendly language that transpiles to [Effect-TS](https://effect.website), version 4. Inspired by https://forma-lang.com/effect. Each function contract names its result, its expected failures, and the services that it uses. The transpiler turns that contract into an `Effect.Effect<A, E, R>` type.

The transpiler targets selected `effect` core modules, including `Effect`, `Context`, `Layer`, `Option`, `Schema`, `Stream`, `Sink`, and `Schedule`. It also uses selected ecosystem modules through typed host adapters:

- `effect/http`, `FileSystem`, and the `@effect/platform-node`, `@effect/platform-bun`, and `@effect/platform-browser` runtimes
- `effect/sql` and the `@effect/sql-*` drivers, such as `@effect/sql-pg`
- `@effect/opentelemetry` for traces, metrics, and logs

Core 1 is specified in design draft 0.57. The effective-lang repository implements the documented core 1 subset, including four-channel Schema composition, effectful optional-field getters and defaults, guarded required-encoded to optional-decoded fields, ordered general unions, nullable optional fields with explicit null policies, default encoding strategies, missing-or-null defaults, encoded-value defaults, type-side construction, constructor metadata with separate make inputs, propagation through optional adapters and guarded recursive Schemas, guarded recursive data records, separate recursive decoded and encoded representations, constructor defaults on field descriptors with preserved presence flags, explicit retained, target-selected or reset defaults through adapter order, and guarded recursive fields through wire-default and optional-bridge adapters. The [Core 1 showcase](public/index.html#core1-showcase) pairs scoped concurrency, scheduled streams, and Schema field-presence source with Effect-TS translations; its [full Effective source](public/effective-examples/core1.eff) passes the compiler and strict emitted TypeScript check. The repository tracks the remaining parity gaps. Ecosystem packages require typed host adapters. The Effect-TS examples are manually written and pass strict TypeScript checks against Effect 4.0.5.

The accepted [application acceptance rule](public/effective-spec.html#application-acceptance) bounds further additions. A service workflow, a scheduled worker, and a stream processor must compile with precise contracts and pass failure, cancellation, and cleanup checks.

The [scheduled worker](public/effective-examples/scheduled-worker/README.md) now passes with existing source forms and nine compiled runtime checks. The [service workflow](public/effective-examples/service-workflow/README.md) also passes with a registered atomic SQL adapter and fourteen compiled runtime checks. The [stream processor](public/effective-examples/stream-processor/README.md) also passes with ordered concurrent mapping, backpressure, selective fallback and thirteen runtime cases.

All three application gates are complete. The accepted stopping rule selects no further automatic API additions; release acceptance remains separate work. Item 9 remains deferred.

## This repository

This repository contains the Effective mini book, the language specification, and their source files. The site files are in `public/`.

## Serve the site

To preview the site locally, run `deno task dev` and open `http://localhost:8787`.

## Check the site

Each Effective example on both pages has an Effect-TS tab. Run `deno task typecheck` to check every Effect-TS translation against Effect 4.0.5 under strict settings. The check fails when an Effective example has no Effect-TS tab. Run `deno task test` to test the server in `main.ts`.

## Publish a CSS or JavaScript change

The `deno task stamp` task copies the `version` from `deno.json` into the `site.css` and `site.js` links of both pages. The server caches these assets for one hour, so a new version gives returning readers new asset URLs. To publish a CSS or JavaScript change at once, increase the version in `deno.json` and then run `deno task stamp`. `deno task test` fails when a page link does not match `deno.json`.

## Deploy to Deno Deploy

The `deploy` section of `deno.json` sets the runtime: a dynamic app with `main.ts` as the entrypoint. Deno Deploy uses this section on every deploy.

To create the application, run this command in the repository root. Replace `<org>` with your Deno Deploy organization.

```sh
deno deploy create --org <org> --app effective --source local --runtime-mode dynamic --entrypoint main.ts --region global
```

To deploy a new version, run `deno deploy --prod` in the repository root.
