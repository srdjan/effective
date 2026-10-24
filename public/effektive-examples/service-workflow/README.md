# Service workflow application

The workflow uses existing Effektive forms. Source validates input, checks
business rules, obtains a catalog price and selects transient storage retries.
The registered typed host adapter supplies one atomic save through native SqlClient.

Files in this directory:

- [contracts.eff](contracts.eff): request, receipt, errors and service contracts.
- [host.effi](host.effi): opaque database, runtime and provider declarations.
- [workflow.eff](workflow.eff): validation, catalog access and storage retries.
- [adapter.ts](adapter.ts): atomic SQL save and receipt validation.
- [driver.ts](driver.ts): recording SQL connections and catalog driver.
- [main.ts](main.ts): runnable entry point.
- [checks.ts](checks.ts): fifteen compiled application checks.
- [effective.json](effective.json): registered host configuration.
- [deno.json](deno.json): pinned Effect imports and strict checking options.

Download these files together. Use the effektive-lang CLI to build this
directory with --validate --tsc. Build writes contracts.ts and workflow.ts
beside the source files. It also writes host.effi.ts, the companion module of
host.effi. The adapter and the drivers import the Runtime service from it. From the downloaded directory, run:

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
The tests also inject assertion failures during cleanup.
Cleanup still unblocks rollback, commit and release before the parent joins child fibers.

The service workflow gate passes with a typed transaction adapter. All three
application gates now pass using existing forms. These recording drivers perform no external I/O.
The simulated COMMIT error precedes committed-state mutation and proves no retry.
It does not establish actual ambiguous-commit behavior or external integration.
Gap item 9 remains deferred.


## Real HTTP and SQLite acceptance

The separate [integration driver](integration_driver.ts) supplies a loopback
HTTP catalog and a temporary file-backed SQLite database through the same
host contract and source workflow. After building this directory, run its
[seven integration checks](integration_checks.ts) with Deno 2.9.7:

```sh
deno test --config deno.json --allow-read --allow-write --allow-net=127.0.0.1 integration_checks.ts
```

They cover persisted bound values, invalid input, malformed/non-success HTTP,
permanent database rejection, rollback after an actual insert, cancellation
and connection close. Synchronization waits for the pending HTTP request or
completed insert before interruption. SQLite calls are synchronous; the check
interrupts an open transaction after insertion, not a running native SQL call.
These local checks establish no distributed transaction, ambiguous-commit,
idempotency or exactly-once guarantee. The original recording checks remain.
