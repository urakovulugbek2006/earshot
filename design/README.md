# Earshot design system

Direction C ("Signal"). Light and dark, both first-class.

## The visual thesis, in one line

**Hard 2px borders, flat colour, zero blur — the people in the room are the
content.** If you add a soft shadow or a gradient, you have left the system.

## Files

| File | Role |
|---|---|
| `tokens.json` | **Source of truth.** DTCG format. Three tiers: `primitive` (raw palette) → `semantic` (what a colour is *for*) → scales. |
| `theme.css` | Emitted semantic layer: CSS custom properties + the Tailwind v4 `@theme` bridge. |
| `build-tokens.mjs` | Style Dictionary build (lands with the repo scaffold). |

## The pipeline

```
Figma variables  ←→  tokens.json  →  Style Dictionary  →  theme.css  →  Tailwind utilities
   (designing)       (truth)                              (CSS vars)     (components)
```

Figma and `tokens.json` are kept in sync deliberately, in one direction at a
time — never edited simultaneously. When a colour changes, it changes in
`tokens.json` first, then gets pushed to Figma.

## The three rules

1. **A component never names a colour.** It asks for a *role*: `bg-surface`,
   `text-muted`, `border-strong`. A raw hex in a component is a bug, and the
   lint rule in week 2 will fail the build on one.
2. **Never reference `primitive.*` from a component.** Primitives exist only to
   be referenced by `semantic.*`. This is what makes the dark theme possible
   without touching a single component.
3. **The scale or nothing.** No arbitrary pixel values for space, size or
   radius. If the scale can't express it, the design is wrong, not the scale.

## Why the dark theme is not an inversion

Two decisions that an automatic inversion would get wrong:

- **`border-strong` flips to a *light* value** (`sand-200`), not a darker one.
  The entire visual language is 2px edges; in dark mode those edges have to
  stay visible, so they go light against a near-black ground. An inverted
  palette would make them disappear.
- **`accent` lightens from `blue-600` to `blue-400`.** `blue-600` on
  `sand-950` is about 3.1:1 — below the 4.5:1 floor. It is not a style
  preference; the darker blue is simply unreadable there.

`status-highlight` (lime) is the one token that does *not* change: it carries
dark text in both themes, and it's the in-sync indicator, so it should look
identical whichever theme you're in.

## Contrast floors

Checked, not assumed. `text-muted` is the floor in both themes — nothing
lighter is allowed to carry text.

| Pair | Light | Dark |
|---|---|---|
| `text-primary` on `bg-base` | ~15:1 | ~16:1 |
| `text-secondary` on `bg-base` | ~8:1 | ~9:1 |
| `text-muted` on `bg-base` | ~6.5:1 | ~8:1 |
| `text-on-accent` on `accent` | ~6.3:1 | ~7:1 |
| `text-on-highlight` on `status-highlight` | ~14:1 | ~14:1 |

## Figma

The matching Figma library is created once a plan is selected in the Figma
widget. `tokens.json` maps 1:1 onto Figma variable collections:
`primitive`, `semantic` (with Light and Dark modes), `scale`.
