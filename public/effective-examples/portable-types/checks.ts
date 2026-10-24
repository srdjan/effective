import { assert, assertEquals } from "@std/assert";
import { Option } from "effect";
import { parsePositive, toInt } from "./domain.ts";
import { doubleAll, keepAll } from "./consumer.ts";

Deno.test("the owner rejects nonpositive input", () => {
  assert(Option.isNone(parsePositive(0)));
  assert(Option.isNone(parsePositive(-1)));
});

Deno.test("an imported pure callback transforms sealed values", () => {
  const parsed = parsePositive(3);
  assert(Option.isSome(parsed));
  assertEquals(doubleAll([parsed.value]).map(toInt), [6]);
});

Deno.test("an inline pure callback preserves sealed values", () => {
  const parsed = parsePositive(3);
  assert(Option.isSome(parsed));
  assertEquals(keepAll([parsed.value]).map(toInt), [3]);
});
