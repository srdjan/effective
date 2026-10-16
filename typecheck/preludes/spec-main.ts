// deno-lint-ignore-file verbatim-module-syntax
// The harness merges this import into the unit file, so it must stay a value import.
import { Layer } from "effect";

declare const UsersLive: Layer.Layer<Users>;
