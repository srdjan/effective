# Stream processor application

The processor uses existing Effektive forms. Source owns live pulls, ordered
concurrent mapping, selective fallback, buffering, batching and session brackets.
The driver supplies primitive recording operations and performs no external I/O.

Files in this directory:

- [contracts.eff](contracts.eff): item, output, error and service contracts.
- [processor.eff](processor.eff): complete pipeline and resource lifetimes.
- [driver.ts](driver.ts): primitive input, transformation and output drivers.
- [main.ts](main.ts): runnable entry point.
- [checks.ts](checks.ts): thirteen compiled application checks.
- [effektive.json](effektive.json): compiler project configuration.
- [deno.json](deno.json): pinned Effect imports and strict checking options.

Download these files together. Use the effektive-lang CLI to build this
directory with --validate --tsc. Build writes contracts.ts and processor.ts
beside the source files. From the downloaded directory, run:

```sh
deno run --config deno.json main.ts
deno test --config deno.json checks.ts
```

Source opens input before output and closes output before input. Each run
starts fresh sessions and pull progress. Mapping runs at most two transformations
and preserves input order. Recoverable transformation failures become marked
fallbacks containing the original value. Other typed failures propagate.
Recovery does not restart input or retry output writes.

The input buffer has capacity two. The blocked-output test confirms that the
pinned pipeline stops at seven pull calls, then resumes when demand returns.
This trace includes work in progress and establishes no global memory limit.
Live input can wait for later arrivals without ending the stream.

Source writes batches of two and a final partial batch, suppressing empty
terminal batches. Native transduction can emit a partial batch before input
failure. Completed writes remain visible after later failure or cancellation.
The application promises no rollback or exactly-once delivery.

Cancellation of pending input or output awaits pipeline work and both session
finalizers. Execution defects and session cleanup defects remain defects.
Remaining finalizers run after a cleanup defect. Item recovery follows native
catchTags semantics: a matching typed reason can hide an accompanying defect
from an arbitrary mixed transformation cause. A separate check records this
limit. The normal transformation driver has no defecting cleanup, and session
cleanup occurs outside item recovery.

All three accepted application gates now pass using existing forms. The
accepted language stopping rule is satisfied. External integration, performance,
packaging and editor acceptance remain separate work. Item 9 stays deferred.
