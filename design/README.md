# Earshot design system

The instrument language on a rooms-first information architecture.
**Dark is the primary theme; light is secondary.**

## The visual thesis, in one line

**Near-black, 1px hairlines, no shadows at all, and every number in mono —
the data is the design.** If you add a shadow or a gradient, you have left
the system.

## Two decisions, kept separate

The design went through three looks before settling, and the useful lesson is
that **structure and skin are independent**:

- **Structure** ([ADR-0011](../docs/adr/0011-rooms-first-ia.md)) — top
  navigation, rooms as the primary object, data tables instead of cover
  shelves, room strip docked to the top. This is what stops it reading as
  Spotify, and it has survived a complete change of skin unaltered.
- **Skin** ([ADR-0012](../docs/adr/0012-instrument-visual-language.md)) — the
  near-black, hairline, mono-numeral language. Changing it cost a token file
  and a re-colour, not a redesign.

## The palette

| Token | Dark (primary) | Light | Role |
|---|---|---|---|
| `accent` | `#FF2E7E` | `#C2185B` | **Actions only** — play, publish, join, sign in |
| `status.live` | `#F3C84E` | `#8A6A08` | **Means live** — in-sync chip, on-air rooms |
| `status.warn` | `#E0953A` | `#B45309` | Drifting, reconnecting |
| `status.error` | `#F0564A` | `#F0564A` | Failed jobs |
| `status.info` | `#7A8CF0` | `#4338CA` | Tertiary fills |
| `bg.base` | `#0B0B0D` | `#F7F7F8` | Ground |
| `border.hair` | `#24242B` | `#E2E2E6` | The 1px signature |

**Magenta is for actions. Gold is for live state.** A header is not a button;
if everything clickable and everything live share a colour, neither means
anything.

## Files

| File | Role |
|---|---|
| `tokens.json` | **Source of truth.** DTCG. `primitive` → `semantic` → scales. |
| `theme.css` | Emitted CSS custom properties + the Tailwind v4 `@theme` bridge. |
| `build-tokens.mjs` | Style Dictionary build (lands with the repo scaffold). |

## The five rules

1. **A component never names a colour.** It asks for a role: `bg-surface`,
   `text-muted`, `border-hair`. A raw hex in a component is a bug, and the
   week-2 lint rule fails the build on one.
2. **Never reference `primitive.*` from a component.** Primitives exist only
   to be referenced by `semantic.*`. That indirection is the only reason a
   whole skin change cost one file.
3. **Every number is mono, with tabular figures.** BPM, key, timecode,
   milliseconds, LUFS, counts, percentages. Not decoration: tabular figures
   stop a value that updates every second from making its row jitter, and keep
   table columns aligned.
4. **No shadows.** Depth comes from the `base → surface → raised` background
   steps plus hairlines. There are no shadow tokens to reach for.
5. **1px is the default border.** 2px is reserved for focus rings.

## Why light is not an inversion

- **The accent darkens** going to light (`#FF2E7E` → `#C2185B`) rather than
  lightening — the opposite of the usual move, because the dark theme is the
  one that needed the lifted value in the first place (`#C2185B` is 3.27:1 on
  `#0B0B0D`).
- **Gold changes value, not just brightness.** `#F3C84E` is 1.7:1 on paper and
  cannot carry text, so light uses `#8A6A08`.
- The hairline flips from `#24242B` to `#E2E2E6` — in both themes it is the
  quietest visible step away from the surface, which is a *relationship*, not
  a value.

## Contrast floors

Checked, not assumed. `text-muted` is the floor in both themes.

| Pair | Dark | Light |
|---|---|---|
| `text-primary` on `bg-base` | ~17:1 | ~16:1 |
| `text-secondary` on `bg-base` | ~10:1 | ~9:1 |
| `text-muted` on `bg-base` | ~5.3:1 | ~5.4:1 |
| `text-on-accent` on `accent` | ~5.5:1 | ~5.9:1 |
| `accent` as text on `bg-base` | ~5.5:1 | ~5.9:1 |
| `status.live` as text on `bg-base` | ~12:1 | ~4.7:1 |

## Touch targets

Visual controls are 36px in the top nav and room strip, which is denser than
44px. The WCAG 2.1 AA hit area is preserved by padding and enforced in
`theme.css` base rules, not per component — so a dense control cannot
accidentally ship with a small hit area.

## Figma

`tokens.json` maps 1:1 onto Figma variable collections: `primitive`,
`semantic` (Dark and Light modes), `scale`.
