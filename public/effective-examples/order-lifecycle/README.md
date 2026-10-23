# Order lifecycle application

This application is a witness for nominal types. It is not one of the three
gate applications that the accepted stopping rule names. It models an order and
its pricing with nominal declarations.

Files in this directory:

- [contracts.eff](contracts.eff): four order states, the InvalidTransition error, the pricing rule tree and the input record.
- [orders.eff](orders.eff): transitions, match by name, pricing and JSON decoding.
- [main.ts](main.ts): runnable entry point that prints a JSON report.
- [checks.ts](checks.ts): nine compiled application checks.
- [effective.json](effective.json): compiler project configuration.
- [deno.json](deno.json): pinned Effect imports and strict checking options.

Download these files together. Use the effective-lang CLI to build this
directory with --validate --tsc. Build writes contracts.ts and orders.ts
beside the source files. From the downloaded directory, run:

```sh
deno run --config deno.json main.ts
deno test --config deno.json checks.ts
```

The four states Pending, Paid, Shipped and Cancelled are nominal record types. Each has a
runtime tag that includes the module name, for example "contracts#Pending". A
function that accepts one state, such as pay(order: Pending, ...), rejects the
other states at compile time. A match over Order has one arm for each state and
no wildcard arm. A missing state is a compile error.

The pricing rules form a recursive tree of Fixed, Times, Capped and Sum. The
price of Times is the base price times the factor. A percent rule is not
possible, because the division operator always gives number and the prelude has
no rounding function.

The function fromInput decodes the plain record OrderInput from unknown JSON.
It then builds a Pending value with the nominal constructor. JSON with a wrong or
missing tag fails decodeOrder.

The nine checks cover each transition, each stateOf and describe result, isOpen
and the InvalidTransition failure. They price the sample rule from source and
one rule that TypeScript builds with make. They decode valid and invalid input,
check that the encoded form keeps the tag, and check the rejected decode of a
wrong tag.
