# Earshot design system

Direction C ("Signal"), Timurid palette. Light and dark, both first-class.

## The visual thesis, in one line

**Hard 2px borders, flat colour, zero blur — the people in the room are the
content.** If you add a soft shadow or a gradient, you have left the system.

## The palette

Hues come from the standard of Amir Temur and from Timurid tilework:

| Token | Value | Role |
|---|---|---|
| `turquoise.500` | `#0099B5` | The brand. The *ko'k* of the Timurid banner — the same blue the flag of Uzbekistan takes from it |
| `turquoise.700` | `#00707F` | Links and small text, where the brand blue fails contrast |
| `gold.500` | `#F3C84E` | The in-sync indicator and live room header |
| `terracotta.500` | `#D9542B` | Warnings, reconnecting state |
| `lapis.500` | `#2B4C9B` | Tertiary fills, avatars |
| `sand.100` | `#F6F4EF` | Light ground |
| `slate.900` | `#0F1417` | Dark ground |
| `ink` | `#141413` | Every border, all primary text |

The logo mark is the **three rings of the Timurid banner**, not a generic square.

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

## The four rules

1. **A component never names a colour.** It asks for a *role*: `bg-surface`,
   `text-muted`, `border-strong`. A raw hex in a component is a bug, and the
   lint rule in week 2 will fail the build on one.
2. **Never reference `primitive.*` from a component.** Primitives exist only to
   be referenced by `semantic.*`. This is what makes the dark theme possible
   without touching a single component.
3. **The turquoise is a fill, never a text colour.** `#0099B5` on white is
   **3.37:1** — below the 4.5:1 floor — so white text on it is forbidden and
   small turquoise text is forbidden. Anything sitting *on* the turquoise is
   near-black (`text.onAccent`); links and small text use `accent.text`
   (`#00707F`, 5.8:1).
4. **The scale or nothing.** No arbitrary pixel values for space, size or
   radius. If the scale can't express it, the design is wrong, not the scale.

## Why the dark theme is not an inversion

Three decisions an automatic inversion would get wrong:

- **`border-strong` flips to a *light* value** (`slate.200`). The entire visual
  language is 2px edges; in dark mode those edges have to stay visible, so they
  go light against a near-black ground. An inverted palette would make them
  disappear and the look would collapse.
- **`accent` lightens** from `turquoise.500` to `turquoise.300` (`#22C3DB`).
  `#0099B5` on `#0F1417` is about 3.1:1 — unreadable. Not a preference.
- **The ground cools** from warm sand (`#F6F4EF`) to blue-black (`#0F1417`).
  A warm dark ground under a turquoise accent goes muddy; the cool ground lets
  the turquoise sit cleanly.

`status.highlight` (gold) is the one token that does **not** change: it carries
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
| `text-on-accent` on `accent` | ~5.5:1 | ~7:1 |
| `accent-text` on `bg-base` | ~5.8:1 | ~9:1 |
| `text-on-highlight` on `status-highlight` | ~10.9:1 | ~10.9:1 |
| **white on `accent`** | **3.37:1 — FORBIDDEN** | — |

## Figma

`tokens.json` maps 1:1 onto Figma variable collections: `primitive`,
`semantic` (with Light and Dark modes), `scale`.
