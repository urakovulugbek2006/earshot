# Earshot design system

Direction A's night palette on a rooms-first information architecture.
**Night is the primary theme; light is secondary.**

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

| Token | Night (primary) | Light | Role |
|---|---|---|---|
| `accent` | `#22D3EE` | `#0E7490` | **Actions only** — play, publish, join, sign in |
| `status.live` | `#F3C84E` | `#8A6A08` | **Means live** — in-sync chip, on-air rooms |
| `status.warn` | `#E0953A` | `#B45309` | Drifting, reconnecting |
| `status.error` | `#F0564A` | `#C4392E` | Failed jobs |
| `status.info` | `#7A8CF0` | `#4338CA` | Tertiary fills |
| `bg.base` | `#0A0B0D` | `#F7F8FA` | Ground |
| `border.hair` | `#23272E` | `#DDE1E7` | The 1px signature |

**Cyan is for actions. Gold is for live state. Amber is for drifting.** A
header is not a button; if everything clickable and everything live share a
colour, neither means anything. Cyan against gold/amber is also a cool/warm
split, which makes the action/status divide legible at a glance.

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

- **The accent darkens** going to light (`#22D3EE` → `#0E7490`) rather than
  lightening — the opposite of the usual move. The bright cyan is 1.9:1 on
  paper, effectively invisible.
- **Gold changes value, not just brightness.** `#F3C84E` is 1.7:1 on paper and
  cannot carry text, so light uses `#8A6A08`.
- The hairline flips from `#24242B` to `#E2E2E6` — in both themes it is the
  quietest visible step away from the surface, which is a *relationship*, not
  a value.

## Contrast floors

Checked, not assumed. `text-muted` is the floor in both themes.

Verified programmatically across eleven pairs per theme — no failures.

| Pair | Night | Light |
|---|---|---|
| `text-primary` on `bg-base` | 17.1:1 | 17.7:1 |
| `text-secondary` on `bg-base` | 11.9:1 | 8.4:1 |
| `text-muted` on `bg-base` | 6.3:1 | 4.9:1 |
| `accent` as text on `bg-base` | **10.9:1** | 5.0:1 |
| `text-on-accent` on `accent` | 10.1:1 | 5.4:1 |
| `status.live` as text on `bg-base` | 12.4:1 | 4.8:1 |
| `status.warn` as text on `bg-base` | 8.0:1 | 4.7:1 |

The night theme has no pair under 5.7:1. **Light is tighter** — gold at 4.8 and
amber at 4.7 clear the 4.5 floor with little margin, so neither may be used at
small sizes on `bg-base` without re-checking.

## Touch targets

Visual controls are 36px in the top nav and room strip, which is denser than
44px. The WCAG 2.1 AA hit area is preserved by padding and enforced in
`theme.css` base rules, not per component — so a dense control cannot
accidentally ship with a small hit area.

## Figma

`tokens.json` maps 1:1 onto Figma variable collections: `primitive`,
`semantic` (Dark and Light modes), `scale`.
