// Type-check harness for the Effect-TS panels on the documentation pages.
//
// The harness reads the Effect-TS panels from public/index.html,
// public/effective-spec.html, and the contract explorer in public/site.js.
// It builds one TypeScript file for each unit and runs `deno check` over all
// units. See docs/plans/2026-10-16-effect-ts-tabs.md for the full contract.
//
// Usage:
//   deno run --allow-read --allow-write --allow-run typecheck/check.ts \
//     [--page index|spec|all] [--strict]

type Result<T, E> = { readonly ok: true; readonly value: T } | {
  readonly ok: false;
  readonly error: E;
};

const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });

type PageName = "index" | "spec";
type PageFilter = PageName | "all";

type Panel = {
  readonly id: string | null;
  readonly unit: string;
  readonly code: string;
  readonly page: PageName;
  readonly origin: string;
};

type MissingBlock = {
  readonly page: PageName;
  readonly origin: string;
};

type Unit = {
  readonly name: string;
  readonly page: PageName;
  readonly panels: Panel[];
  readonly requires: string[];
};

type Loaded = {
  readonly panels: readonly Panel[];
  readonly units: readonly Unit[];
  readonly missing: readonly MissingBlock[];
};

const root = new URL("..", import.meta.url);
const rootPath = (relative: string): string =>
  decodeURIComponent(new URL(relative, root).pathname);

const namePattern = /^[A-Za-z0-9-]+$/;

// Requirements of each contract explorer function in public/site.js. The
// getUser entry also names the static panel in index.html: the two must match.
const explorerRequires: ReadonlyMap<string, readonly string[]> = new Map([
  ["getUser", ["users-declarations"]],
  ["rename", ["users-declarations", "explorer-getUser"]],
  ["displayName", ["users-declarations", "explorer-getUser"]],
  ["activeNames", ["users-declarations"]],
]);

const entities: ReadonlyMap<string, string> = new Map([
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["amp", "&"],
  ["#x27", "'"],
  ["#39", "'"],
]);

const decodeEntities = (text: string): string =>
  text.replace(
    /&(lt|gt|quot|amp|#x27|#39);/g,
    (whole, name: string) => entities.get(name) ?? whole,
  );

const attribute = (attributes: string, name: string): string | null => {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes);
  return match === null ? null : (match[1] ?? null);
};

const lineOf = (text: string, offset: number): number =>
  text.slice(0, offset).split("\n").length;

const stripTags = (html: string): string =>
  decodeEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();

const splitList = (value: string | null): string[] =>
  value === null ? [] : value.split(/\s+/).filter((item) => item.length > 0);

type PageScan = {
  readonly panels: Panel[];
  readonly requires: Map<string, string[]>;
  readonly missing: MissingBlock[];
};

const scanPage = (
  page: PageName,
  file: string,
  html: string,
  errors: string[],
): PageScan => {
  const panels: Panel[] = [];
  const requires = new Map<string, string[]>();
  const missing: MissingBlock[] = [];
  const figurePattern = /<figure\b([^>]*)>([\s\S]*?)<\/figure>/g;
  const panelPattern =
    /<div class="code-panel"([^>]*)>\s*<pre[^>]*>\s*<code class="language-typescript">([\s\S]*?)<\/code><\/pre>\s*<\/div>/g;

  for (const figure of html.matchAll(figurePattern)) {
    const figureAttributes = figure[1] ?? "";
    const body = figure[2] ?? "";
    const line = lineOf(html, figure.index ?? 0);
    const origin = `${file}:${line}`;
    const caption = /<figcaption>([\s\S]*?)<\/figcaption>/.exec(body);
    const label = caption === null
      ? "(no caption)"
      : stripTags(caption[1] ?? "");
    const unit = attribute(figureAttributes, "data-check");
    const figureRequires = splitList(
      attribute(figureAttributes, "data-check-requires"),
    );
    let effectPanels = 0;

    for (const panel of body.matchAll(panelPattern)) {
      const panelAttributes = panel[1] ?? "";
      if (attribute(panelAttributes, "data-tab") !== "Effect-TS") continue;
      effectPanels += 1;
      if (unit === null) {
        errors.push(`${origin}: Effect-TS panel without data-check on figure`);
        continue;
      }
      if (!namePattern.test(unit)) {
        errors.push(`${origin}: unit name "${unit}" must match [A-Za-z0-9-]+`);
      }
      const id = attribute(panelAttributes, "data-check-id");
      if (id !== null && !namePattern.test(id)) {
        errors.push(`${origin}: id "${id}" must match [A-Za-z0-9-]+`);
      }
      panels.push({
        id,
        unit,
        code: decodeEntities(panel[2] ?? ""),
        page,
        origin,
      });
      requires.set(unit, [
        ...(requires.get(unit) ?? []),
        ...figureRequires.filter((item) =>
          !(requires.get(unit) ?? []).includes(item)
        ),
      ]);
    }

    if (effectPanels === 0 && body.includes('class="language-effective"')) {
      missing.push({ page, origin: `${origin} ${label}` });
    }
  }
  return { panels, requires, missing };
};

type ExplorerEntry = {
  readonly name: string;
  readonly effect: string;
};

const scanExplorer = (
  javascript: string,
  errors: string[],
): ExplorerEntry[] => {
  const entries: ExplorerEntry[] = [];
  const pattern =
    /(\w+): \{\n\s+source: `[^`]*`,(?:(?!source: `)[\s\S])*?effect: `([^`]*)`,/g;
  for (const match of javascript.matchAll(pattern)) {
    const name = match[1] ?? "";
    const effect = match[2] ?? "";
    if (effect.includes("\\") || effect.includes("${")) {
      errors.push(
        `public/site.js: effect for ${name} has a backslash or "\${"`,
      );
    }
    entries.push({ name, effect });
  }
  const found = entries.map((entry) => entry.name).sort().join(",");
  const expected = [...explorerRequires.keys()].sort().join(",");
  if (found !== expected) {
    errors.push(
      `public/site.js: explorer functions with an effect string are [${found}], expected [${expected}]`,
    );
  }
  return entries;
};

const readText = async (relative: string): Promise<string> =>
  await Deno.readTextFile(rootPath(relative));

const load = async (): Promise<Result<Loaded, string[]>> => {
  const errors: string[] = [];
  const [indexHtml, specHtml, siteJs] = await Promise.all([
    readText("public/index.html"),
    readText("public/effective-spec.html"),
    readText("public/site.js"),
  ]);
  const index = scanPage("index", "public/index.html", indexHtml, errors);
  const spec = scanPage("spec", "public/effective-spec.html", specHtml, errors);

  const panels: Panel[] = [...index.panels, ...spec.panels];
  const requiresByUnit = new Map<string, string[]>();
  for (const scan of [index, spec]) {
    for (const [unit, list] of scan.requires) {
      requiresByUnit.set(unit, [...(requiresByUnit.get(unit) ?? []), ...list]);
    }
  }

  const htmlExplorer = panels.find((panel) => panel.id === "explorer-getUser");
  for (const entry of scanExplorer(siteJs, errors)) {
    if (entry.name === "getUser") {
      if (htmlExplorer === undefined) {
        errors.push("public/index.html: panel explorer-getUser is missing");
      } else if (htmlExplorer.code.trim() !== entry.effect.trim()) {
        errors.push(
          "public/site.js: functions.getUser.effect differs from the static panel explorer-getUser in public/index.html",
        );
      }
      const wanted = (explorerRequires.get("getUser") ?? []).join(" ");
      const actual = (requiresByUnit.get("explorer-getUser") ?? []).join(" ");
      if (wanted !== actual) {
        errors.push(
          `public/index.html: explorer-getUser requires [${actual}], expected [${wanted}]`,
        );
      }
      continue;
    }
    const unit = `explorer-${entry.name}`;
    panels.push({
      id: unit,
      unit,
      code: entry.effect,
      page: "index",
      origin: `public/site.js (${entry.name})`,
    });
    requiresByUnit.set(unit, [...(explorerRequires.get(entry.name) ?? [])]);
  }

  const byId = new Map<string, Panel>();
  for (const panel of panels) {
    if (panel.id === null) continue;
    const previous = byId.get(panel.id);
    if (previous !== undefined) {
      errors.push(
        `duplicate id "${panel.id}" at ${panel.origin} and ${previous.origin}`,
      );
    } else {
      byId.set(panel.id, panel);
    }
  }

  const units = new Map<string, Unit>();
  for (const panel of panels) {
    const existing = units.get(panel.unit);
    if (existing === undefined) {
      units.set(panel.unit, {
        name: panel.unit,
        page: panel.page,
        panels: [panel],
        requires: requiresByUnit.get(panel.unit) ?? [],
      });
    } else {
      if (existing.page !== panel.page) {
        errors.push(
          `unit "${panel.unit}" has panels on two pages (${panel.origin})`,
        );
      }
      existing.panels.push(panel);
    }
  }
  for (const unit of units.values()) {
    for (const id of unit.requires) {
      if (!byId.has(id)) {
        errors.push(`unit "${unit.name}" requires unknown id "${id}"`);
      }
    }
  }

  if (errors.length > 0) return fail(errors);
  return ok({
    panels,
    units: [...units.values()],
    missing: [...index.missing, ...spec.missing],
  });
};

// A prelude can hold imports from "effect", declare statements, and type
// statements only. It never copies a declaration that a page displays.
const validatePrelude = (name: string, text: string): string[] => {
  const errors: string[] = [];
  const withoutComments = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const line of withoutComments.split("\n")) {
    if (line.trim() === "" || /^\s/.test(line)) continue;
    if (/^(import|declare|type|export type)\b/.test(line)) {
      if (
        line.startsWith("import") && !/from\s*"effect"/.test(line) &&
        !line.trimEnd().endsWith(",") && !line.trimEnd().endsWith("{")
      ) {
        errors.push(`prelude ${name}: only imports from "effect" are allowed`);
      }
      continue;
    }
    if (/^[}\])>|&,]/.test(line)) continue;
    errors.push(`prelude ${name}: statement not allowed: ${line.trim()}`);
  }
  return errors;
};

const effectImportPattern =
  /^import\s*\{([^}]*)\}\s*from\s*"effect"\s*;?[ \t]*$/gm;
const anyImportPattern = /^import\s[^;"]*?from\s*"[^"]+"\s*;?[ \t]*$/gm;

const mergeImports = (text: string): string => {
  const names: string[] = [];
  for (const match of text.matchAll(effectImportPattern)) {
    for (const raw of (match[1] ?? "").split(",")) {
      const name = raw.trim();
      if (name.length > 0 && !names.includes(name)) names.push(name);
    }
  }
  const body = text
    .replace(effectImportPattern, "")
    .replace(anyImportPattern, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const header = names.length > 0
    ? `import { ${names.join(", ")} } from "effect"\n\n`
    : "";
  return `${header}${body}\n\nexport {}\n`;
};

const buildUnit = async (
  unit: Unit,
  byId: ReadonlyMap<string, Panel>,
): Promise<Result<string, string[]>> => {
  const own = new Set(unit.panels.map((panel) => panel.id));
  const snippets: string[] = [];
  for (const id of unit.requires) {
    if (own.has(id)) continue;
    const required = byId.get(id);
    if (required !== undefined) snippets.push(required.code.trim());
  }
  for (const panel of unit.panels) snippets.push(panel.code.trim());

  const preludePath = rootPath(`typecheck/preludes/${unit.name}.ts`);
  try {
    const prelude = await Deno.readTextFile(preludePath);
    const problems = validatePrelude(unit.name, prelude);
    if (problems.length > 0) return fail(problems);
    snippets.push(prelude.trim());
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  return ok(mergeImports(snippets.join("\n\n")));
};

type Options = { readonly page: PageFilter; readonly strict: boolean };

const parseArguments = (args: readonly string[]): Result<Options, string> => {
  let page: PageFilter = "all";
  let strict = false;
  for (let position = 0; position < args.length; position += 1) {
    const argument = args[position];
    if (argument === "--strict") {
      strict = true;
    } else if (argument === "--page") {
      const value = args[position + 1];
      if (value !== "index" && value !== "spec" && value !== "all") {
        return fail("--page needs one of: index, spec, all");
      }
      page = value;
      position += 1;
    } else {
      return fail(`unknown argument: ${argument}`);
    }
  }
  return ok({ page, strict });
};

const main = async (): Promise<number> => {
  const options = parseArguments(Deno.args);
  if (!options.ok) {
    console.error(options.error);
    return 2;
  }
  const { page, strict } = options.value;

  const loaded = await load();
  if (!loaded.ok) {
    for (const error of loaded.error) console.error(`error: ${error}`);
    return 1;
  }
  const byId = new Map<string, Panel>();
  for (const panel of loaded.value.panels) {
    if (panel.id !== null) byId.set(panel.id, panel);
  }

  const units = loaded.value.units.filter((unit) =>
    page === "all" || unit.page === page
  );
  const missing = loaded.value.missing.filter((block) =>
    page === "all" || block.page === page
  );

  const tempDir = await Deno.makeTempDir({ prefix: "effective-typecheck-" });
  let failed = false;
  try {
    const files: string[] = [];
    for (const unit of units) {
      const built = await buildUnit(unit, byId);
      if (!built.ok) {
        for (const error of built.error) console.error(`error: ${error}`);
        failed = true;
        continue;
      }
      const file = `${tempDir}/${unit.name}.ts`;
      await Deno.writeTextFile(file, built.value);
      files.push(file);
    }

    if (!failed && files.length > 0) {
      const command = new Deno.Command(Deno.execPath(), {
        args: [
          "check",
          "--config",
          rootPath("typecheck/deno.json"),
          ...files,
        ],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await command.output();
      const decoder = new TextDecoder();
      if (!output.success) {
        console.error(decoder.decode(output.stdout));
        console.error(decoder.decode(output.stderr));
        console.error(`FAIL: type check failed (page ${page}).`);
        failed = true;
      } else {
        console.log(
          `OK: ${files.length} units pass strict type check (page ${page}): ${
            units.map((unit) => unit.name).join(", ")
          }`,
        );
      }
    }
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }

  const byPage = (name: PageName): number =>
    missing.filter((block) => block.page === name).length;
  console.log(
    `Missing: ${missing.length} Effective blocks have no Effect-TS panel (book ${
      byPage("index")
    }, spec ${byPage("spec")}).`,
  );
  for (const block of missing) console.log(`  ${block.origin}`);

  if (strict && missing.length > 0) {
    console.error(
      "FAIL: --strict requires an Effect-TS panel for every block.",
    );
    failed = true;
  }
  return failed ? 1 : 0;
};

Deno.exit(await main());
