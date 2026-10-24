# Concepts

> Shared domain vocabulary for this project: entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Example checking

### Figure
One code example on a documentation page, shown as a pair of tabs: the Effektive source and its manual Effect-TS translation.
*Avoid:* tab pair, code block

The type check requires an Effect-TS tab in each figure that shows Effektive source. The Effect-TS tab is illustrative output written by hand, not compiler output.

### Check unit
A named group of Effect-TS tabs that the type check compiles together as one TypeScript file.

Several figures can share one check unit when they build up one module across a chapter. A check unit can require the declarations of other figures; a requirement names the Effect-TS tab of one figure, not a whole check unit. The type check covers only the Effect-TS side of a figure, so a check unit says nothing about whether the Effektive side compiles.
