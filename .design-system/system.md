# Design System

This file records the design rules of the Effective site. The values come from `:root` in `public/site.css`. When a rule changes, update this file in the same commit.

## Direction

**Personality:** Boldness and clarity. Large display type carries each screen. Text has no decoration.

**Foundation:** Warm neutral. White page sheet, warm grey surfaces, and deep navy ink.

**Depth:** Surface tints. Bands of `--bg`, `--surface`, `--ink`, and `--field-light` separate content. Only code figures and the page sheet have a shadow.

## Tokens

### Color

```css
--bg: #ffffff;          /* page sheet */
--surface: #f4f4f2;     /* alternate sections, panels */
--ink: #1f2b4d;         /* text, dark bands */
--muted: #5b6275;       /* labels and notes; 5.53:1 on --surface */
--accent: #f7941d;      /* primary button, active state, comets, glow */
--accent-ink: #1f2b4d;  /* text on --accent */
--focus-ring: #b45f00;
--field-light: #e3e1dc; /* table heads, exercises, footer */
--code-bg: #141d34;
--code-ink: #f4f4f2;
```

The accent is the only saturated hue. Use it for one primary action per view and for active states.

### Typography

Font: Bricolage Grotesque, a variable font with weights 200 to 800. Code uses `--font-code` only in `pre` and `code`.

| Role | Size |
| --- | --- |
| Small | `--small` 14px |
| Body | `--body` 18px, 16px below 800px |
| Lead | `--lead` 24px |
| Heading | `--head` clamp(36px, 4.4vw, 52px) |
| Display | Hero `h1` clamp(48px, 10vw, 120px) |

Weights in use: 400, 500, 600. Display text and headings use negative tracking from -.02em to -.055em.

### Shape and spacing

Corners are square. The only rounded shapes are the comet and its head.

Spacing uses an 8px base. The gutter is 32px, 24px below 800px, and 20px below 520px. Section top padding is 88px on desktop and 56px on a phone.

## Patterns

### Button

- Primary: `.button`, minimum height 58px, padding 16px 24px, `--accent` background, square corners, and a trailing arrow `span`.
- Secondary: `.secondary-action`, transparent background with a 2px inset ring in `--bg`.

### Code figure

- `figure.code` holds a caption, Copy, an Effective tab, and an Effect-TS tab.
- Below a 36rem container width, the caption stacks. Copy then starts on the caption edge.

### Contract explorer

- The large input shows the selected function name. Its label is visually hidden.
- On a phone, the four choices form a 2 x 2 grid with 8px gaps.
- `#contract-message` shows text only for an error. The contract reading is the live region.

### Tables

- A key and value table uses a 35% key column.
- A table of two peer columns uses `class="peers"` for equal columns.

## Rules

- Do not add taglines, helper text, or secondary labels. If a screen needs them to make sense, change the layout.
- Give each fact one home. Before you remove a text, move any fact that occurs only there.
- Keep every interactive target at least 44 by 44px, with 8px between adjacent targets. Links inside paragraphs are exempt.
- Put hover rules inside `@media (hover: hover) and (pointer: fine)`.
- Under `prefers-reduced-motion: reduce`, stop all motion, including comets, glow drift, and entry animation.
- When `site.css` or `site.js` changes, increase `version` in `deno.json` and run `deno task stamp`. Browsers cache these assets for one hour.

## Decisions

| Decision | Rationale | Date |
| --- | --- | --- |
| Remove the hero kicker, the argument band, explorer helper text, chapter subtitles, contents titles, the further-reading strip, and footer taglines | The headings, the explorer, and the chapter content already carry each fact | 2026-10-23 |
| The edition appears in the spec hero and in the book's closing note | Readers of each page find the version without a separate band | 2026-10-23 |
| Comets are 120-220px long and 3px thick, at 95% accent, every 12-24s. The hero glow is 26% accent | The earlier values were almost invisible | 2026-10-23 |
| The second hero line keeps at least 6px from the band edge | At 48px type, .06em touched the edge | 2026-10-23 |
| No photographs or video | A language reference has no honest subject for them | 2026-10-23 |
| Keep the ✳︎ hero spark | It is a text-presentation glyph, not an emoji. The inspector flag is a false positive | 2026-10-23 |
