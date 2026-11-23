# Earshot design system

Violet accent on accent-tinted grounds, on a rooms-first information
architecture. **Night is the primary theme; light is secondary.**

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
| `accent` | `#A78BFA` | `#6D28D9` | **Actions only** — play, publish, join, sign in |
| `status.live` | `#F3C84E` | `#75590A` | **Means live** — in-sync chip, on-air rooms |
| `status.warn` | `#E0953A` | `#97440A` | Drifting, reconnecting |
| `status.error` | `#F0564A` | `#B8352B` | Failed jobs |
| `status.info` | `#7AA2F0` | `#1D4ED8` | Tertiary fills |
| `bg.base` | `#0A0A0F` | `#F4F2F9` | Ground — **tinted**, not grey |
| `bg.surface` | `#14131C` | `#FBFAFE` | Card — **not pure white** |
| `border.hair` | `#262430` | `#DDD8EC` | The 1px signature |

### The grounds are tinted, and that is deliberate

Both neutral ramps are pulled a few points toward the accent hue (~255°, RGB
spread 4–20). **Nothing in the light theme is `#FFFFFF`** — not even a card.
Pure white survives only as `primitive.white`, used exclusively for text and
icons *on* the accent. A pure-white light theme is what every framework hands
you by default, and it reads that way.

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
6. **No surface is pure white.** `#FFFFFF` is `primitive.white` and belongs on
   the accent only. If a component sets a white background, it is a bug.

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
| `text-primary` on `bg-base` | 17.0:1 | 16.5:1 |
| `text-secondary` on `bg-base` | 11.2:1 | 8.8:1 |
| `text-muted` on `bg-base` | 5.7:1 | 5.3:1 |
| `accent` as text on `bg-base` | 7.3:1 | 6.4:1 |
| `text-on-accent` on `accent` | 6.8:1 | 7.1:1 |
| `status.live` as text on `bg-base` | 12.4:1 | 5.9:1 |
| `status.warn` as text on `bg-base` | 8.0:1 | 6.0:1 |

**Nothing in either theme sits under 5.27:1.** The light values for gold and
amber are darker than an untinted theme would need — tinting the ground cost
contrast, and both were dropped a step to pay for it.

### The accent must separate from gold side by side

Violet and gold appear next to each other in the room strip, so the pair is
checked on two axes, not one: **142° of hue and a 1.71 lightness ratio**, which
means they stay distinguishable in greyscale. Teal (the previous accent) had the
same hue gap but a 1.06 lightness ratio — hue was carrying the whole
distinction, which fails for colour-blind viewers. Magenta was worse: 69° of
hue from gold.

## Touch targets

Visual controls are 36px in the top nav and room strip, which is denser than
44px. The WCAG 2.1 AA hit area is preserved by padding and enforced in
`theme.css` base rules, not per component — so a dense control cannot
accidentally ship with a small hit area.

## Figma

`tokens.json` maps 1:1 onto Figma variable collections: `primitive`,
`semantic` (Dark and Light modes), `scale`.
