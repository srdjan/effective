# Effective

Effective is a friendly language that transpiles to [Effect-TS](https://effect.website), version 4. Inspired by https://forma-lang.com/effect. Each function contract names its result, its expected failures, and the services that it uses. The transpiler turns that contract into an `Effect.Effect<A, E, R>` type.

The transpiler targets the `effect` core modules: `Effect`, `Context`, `Layer`, `Option`, and `Schema`. It also targets selected modules from the Effect ecosystem:

- `effect/http`, `FileSystem`, and the `@effect/platform-node`, `@effect/platform-bun`, and `@effect/platform-browser` runtimes
- `effect/sql` and the `@effect/sql-*` drivers, such as `@effect/sql-pg`
- `@effect/opentelemetry` for traces, metrics, and logs

Version 0 specifies the language and the core mapping. Bindings for the ecosystem modules need later specifications. The transpiler is not built yet. The Effect-TS examples are manually written, and they pass strict TypeScript checks against Effect 4.0.5.

## This repository

This repository contains the Effective mini book, the language specification, and their source files. The site files are in `public/`.

## Serve the site

To preview the site locally, run `deno task dev` and open `http://localhost:8787`.

## Check the site

Each Effective example on both pages has an Effect-TS tab. Run `deno task typecheck` to check every Effect-TS translation against Effect 4.0.5 under strict settings. The check fails when an Effective example has no Effect-TS tab. Run `deno task test` to test the server in `main.ts`.

## Build the download package

The "Download package" link in both documents points to `public/effective.zip`. After you change a file in `public/`, run `deno task package` to build the zip again. Commit the zip with the change.

## Deploy to Deno Deploy

The `deploy` section of `deno.json` sets the runtime: a dynamic app with `main.ts` as the entrypoint. Deno Deploy uses this section on every deploy.

To create the application, run this command in the repository root. Replace `<org>` with your Deno Deploy organization.

```sh
deno deploy create --org <org> --app effective --source local --runtime-mode dynamic --entrypoint main.ts --region global
```

To deploy a new version, run `deno deploy --prod` in the repository root.
