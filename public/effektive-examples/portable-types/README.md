# Sealed types and pure callbacks

This project demonstrates sealed nominal types, pure function types, and optional import rules.

The domain module owns `Positive`. Its parser accepts a positive `Int`. Only the domain constructs or changes `Positive` values.
The consumer imports the domain's `double` function and passes that pure function to `apply`.
The consumer can also pass an inline pure callback. The project configuration prevents the domain from importing another module.

Download [domain.eff](domain.eff), [consumer.eff](consumer.eff), [effective.json](effective.json), [deno.json](deno.json), and [checks.ts](checks.ts) together.
From the current effektive-lang checkout, build the downloaded directory:

```sh
deno task effective build /path/to/portable-types --validate --tsc
```

From the example directory, run its checks:

```sh
deno test --config deno.json checks.ts
```

The build creates `domain.ts` and `consumer.ts`. Three runtime checks cover parsing and both callback forms.
The compiler checks source authority. Generated TypeScript remains a trusted boundary.
