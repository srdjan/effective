# Scheduled worker application

The worker uses existing Effective forms. Source owns repetition, selective
retry, progress and resource release. The recording driver supplies in-memory
job operations and primitive waits. The entry point supplies the runtime.

Files in this directory:

- [contracts.eff](contracts.eff): policy, report, errors and service contracts.
- [worker.eff](worker.eff): validation, repetition, retries and resource brackets.
- [driver.ts](driver.ts): recording job and clock drivers.
- [main.ts](main.ts): runnable entry point.
- [reference.ts](reference.ts): pinned native repetition and retry reference.
- [checks.ts](checks.ts): ten compiled application checks.
- [effective.json](effective.json): compiler project configuration.
- [deno.json](deno.json): pinned Effect imports and strict checking options.

Download these files together. Use the effective-lang CLI to build this
directory with --validate --tsc. Build writes contracts.ts and worker.ts beside
the source files. From the downloaded directory, run:

```sh
deno run --config deno.json main.ts
deno test --config deno.json checks.ts
```

Policy fields are safe nonnegative integers. runs counts successful jobs;
retries counts additional attempts per job. The first job starts immediately.
A repetition delay follows each successful job except the last one. Only
Transient JobFailure values are retried. Each attempt completes release before
another attempt or a repetition delay starts.

The runtime entry point may interrupt the worker to shut down. Tests verify
completed cleanup during active work, repetition waits and native retry waits.
Replaying one returned Effect resets source progress and retry budgets.
The tests also inject assertion failures during cleanup.
Cleanup still opens the release gate before the parent joins child fibers.

All three application gates now pass with existing forms. These recording drivers do not establish
external integration coverage or general opaque Schedule consumer support.
Gap item 9 remains deferred.
