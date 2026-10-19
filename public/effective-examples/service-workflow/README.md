# Service workflow application

The workflow uses existing Effective forms. Source validates input, checks
business rules, obtains a catalog price and selects transient storage retries.
The registered typed host adapter supplies one atomic save through native SqlClient.

Files in this directory:

- [contracts.eff](contracts.eff): request, receipt, errors and service contracts.
- [host.effi](host.effi): opaque database, runtime and provider declarations.
- [workflow.eff](workflow.eff): validation, catalog access and storage retries.
- [adapter.ts](adapter.ts): atomic SQL save and receipt validation.
- [driver.ts](driver.ts): recording SQL connections and catalog driver.
- [main.ts](main.ts): runnable entry point.
- [checks.ts](checks.ts): fourteen compiled application checks.
- [effective.json](effective.json): registered host configuration.
- [deno.json](deno.json): pinned Effect imports and strict checking options.

Download these files together. Use the effective-lang CLI to build this
directory with --validate --tsc. Build writes contracts.ts and workflow.ts
beside the source files. From the downloaded directory, run:

```sh
deno run --config deno.json main.ts
deno test --config deno.json checks.ts
```

Invalid input causes no service calls. Source requires quantity between 1 and
100 and catalog prices between 0 and 100000. The catalog driver validates
safe integer prices. Store.save uses a parameterized insert and validates
receipt rows before commit. Failed writes and invalid rows roll back before release.

Only retryable statement failures become Transient StoreFailure values.
Source allows two additional storage attempts, after five and ten milliseconds.
Each attempt finishes cleanup before another lease. Catalog and provider
acquisition occur once per workflow. Replaying one returned Effect starts
a fresh workflow and retry budget.

Provider, lease, BEGIN and COMMIT failures remain Permanent. Mixed causes
retain cleanup defects and prevent retry. Body interruption rolls back and
awaits release. Interruption after COMMIT starts waits for commit and release;
a committed row can remain. The application promises no exactly-once submission.

The service workflow gate passes with a typed transaction adapter. All three
application gates now pass using existing forms. These recording drivers perform no external I/O.
The simulated COMMIT error precedes committed-state mutation and proves no retry.
It does not establish actual ambiguous-commit behavior or external integration.
Gap item 9 remains deferred.
