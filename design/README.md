# Earshot design system

Direction C ("Signal"), magenta palette. Light and dark, both first-class.

## The visual thesis, in one line

**Hard 2px borders, flat colour, zero blur — the people in the room are the
content.** If you add a soft shadow or a gradient, you have left the system.

## The palette

| Token | Value | Role |
|---|---|---|
| `magenta.500` | `#C2185B` | **The brand.** Reserved for *actions*: play, publish, join, sign in |
| `magenta.700` | `#9E1250` | Links and small text |
| `magenta.300` | `#F472B6` | The dark-theme accent |
| `gold.500` | `#F3C84E` | **Means live.** The in-sync chip and the room header, identical in both themes |
| `amber.600` | `#B45309` | Warnings, reconnecting, failed uploads |
| `indigo.500` | `#4338CA` | Tertiary fills, avatars |
| `sand.100` | `#F6F4EF` | Light ground — warm, which is what makes the magenta read as a record sleeve rather than a notification |
| `plum.900` | `#15131A` | Dark ground — neutral plum, carrying a trace of the brand hue |
| `ink` | `#141413` | Every border, all primary text |

### Two roles, kept apart

**Magenta is for actions. Gold is for live state.** That separation is why the
listening-room header is *gold* rather than magenta, even though magenta is the
brand colour — a header is not a button, and if everything clickable and
everything live share a colour, neither means anything.

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
3. **In light mode magenta takes white text; in dark mode it takes dark text.**
   `#C2185B` carries white at 5.9:1. Its dark-mode counterpart `#F472B6` is far
   lighter, so it needs *near-black* text (7.1:1) — the pairing inverts between
   themes. That is what `text.onAccent` is for; never hardcode either side.
4. **The scale or nothing.** No arbitrary pixel values for space, size or
   radius. If the scale can't express it, the design is wrong, not the scale.

## Why the dark theme is not an inversion

Three decisions an automatic inversion would get wrong:

- **`border-strong` flips to a *light* value** (`plum.200`). The entire visual
  language is 2px edges; in dark mode those edges have to stay visible, so they
  go light against a near-black ground. An inverted palette would make them
  disappear and the look would collapse.
- **`accent` lightens, and its text colour flips with it.** `magenta.500` on
  `plum.900` is unreadable, so dark mode uses `magenta.300` — which is light
  enough that white text now fails on it and dark text is required. Rule 3.
- **The ground is neutral plum, not grey or warm sand.** It carries a trace of
  the brand hue so the magenta sits on it without reading cold.

`status.highlight` (gold) is the one token that does **not** change: it carries
dark text in both themes, and it marks live state, so it must look identical
whichever theme you're in.

## Contrast floors

Checked, not assumed. `text-muted` is the floor in both themes — nothing
lighter is allowed to carry text.

| Pair | Light | Dark |
|---|---|---|
| `text-primary` on `bg-base` | ~15:1 | ~16:1 |
| `text-secondary` on `bg-base` | ~8:1 | ~9:1 |
| `text-muted` on `bg-base` | ~6.5:1 | ~6.7:1 |
| `text-on-accent` on `accent` | ~5.9:1 (white) | ~7.1:1 (near-black) |
| `accent-text` on `bg-base` | ~7.9:1 | ~9:1 |
| `accent` as text on `bg-base` | ~5.9:1 ✓ | — |
| `text-on-highlight` on `status-highlight` | ~10.9:1 | ~10.9:1 |

Worth noting against the previous palette: the brand colour is now usable as
**both** a fill and a text colour in light mode. The turquoise it replaced was
3.37:1 on white and could only ever be a fill.

## Figma

`tokens.json` maps 1:1 onto Figma variable collections: `primitive`,
`semantic` (with Light and Dark modes), `scale`.
