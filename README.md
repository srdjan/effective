# Effective documentation site

This repository contains the Effective mini book, the language specification, and their source files. The site files are in `public/`.

## Serve the site

To preview the site locally, run `deno task dev` and open `http://localhost:8787`.

## Build the download package

The "Download package" link in both documents points to `public/effective.zip`. After you change a file in `public/`, run `deno task package` to build the zip again. Commit the zip with the change.

## Deploy to Deno Deploy

The `deploy` section of `deno.json` sets the runtime: a dynamic app with `main.ts` as the entrypoint. Deno Deploy uses this section on every deploy.

To create the application, run this command in the repository root. Replace `<org>` with your Deno Deploy organization.

```sh
deno deploy create --org <org> --app effective --source local --runtime-mode dynamic --entrypoint main.ts --region global
```

To deploy a new version, run `deno deploy --prod` in the repository root.
