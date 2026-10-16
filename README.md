# Effective documentation site

This repository contains the Effective mini book, the language specification, and their source files. The site files are in `public/`.

## Serve the site

`main.ts` serves `public/` with the Deno standard file server. The root path serves the mini book from `index.html`. The server sends `.ts`, `.eff`, and `.lft` files as plain text, because the standard media types send `.ts` as video.

To preview the site locally, run `deno task dev` and open `http://localhost:8787`.

## Build the download package

The "Download package" link in both documents points to `public/effective-docs.zip`. After you change a file in `public/`, run `deno task package` to build the zip again. Commit the zip with the change.

## Deploy to Deno Deploy

To create the application, run this command in the repository root. Replace `<org>` with your Deno Deploy organization.

```sh
deno deploy create --org <org> --app effective-docs --source local --runtime-mode dynamic --entrypoint main.ts --region global
```

To deploy a new version, run `deno deploy --prod` in the repository root.
