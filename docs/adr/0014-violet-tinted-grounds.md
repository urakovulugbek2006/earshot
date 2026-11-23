# ADR-0014: Violet accent on accent-tinted grounds

**Status:** Accepted · **Date:** 2026-11-23
**Supersedes:** the palette of [ADR-0013](0013-direction-a-night-palette.md)
(cyan). The visual language of [ADR-0012](0012-instrument-visual-language.md)
and the information architecture of [ADR-0011](0011-rooms-first-ia.md) are
unchanged.

## Context

Rather than guess at a fifth palette, six candidate accents were rendered on a
single comparison page, each showing the accent in all of its real roles — nav
indicator, button fill, link text, tint, waveform, table highlight — and each
placed **immediately beside the gold LIVE chip**, because that is the pairing
the room strip forces and the one that has to stay readable.

The owner chose **violet**, and separately rejected a plain white ground as
reading "default".

## Options considered

| Accent | On light | Hue gap from gold | Lightness ratio vs gold |
|---|---|---|---|
| Teal `#0E7490` (was ADR-0013) | 5.0:1 | 148° | **1.06** |
| **Violet `#6D28D9`** | **6.4:1** | **142°** | **1.71** |
| Indigo `#4338CA` | 7.4:1 | 161° | 1.56 |
| Blue `#1D4ED8` | 6.3:1 | 179° | 1.32 |
| Magenta `#C2185B` (was ADR-0010) | 5.5:1 | **69°** | 1.16 |
| Ink `#15151A` | 17:1 | 165° | 3.59 |

## Decision

1. **Accent: violet** — `#6D28D9` on light, `#A78BFA` on night.
2. **Both neutral ramps are tinted with the accent hue**, not left grey. In the
   light theme nothing is pure `#FFFFFF` — the card surface is `#FBFAFE`, the
   ground `#F4F2F9`. Pure white survives only as `primitive.white`, used
   exclusively for text and icons *on* the accent.

## Rationale

- The comparison surfaced two defects in palettes already shipped, which is
  the reason this was worth doing on a page rather than in a conversation:
  - **Teal, the accent in use at the time, had almost the same lightness as
    gold** (ratio 1.06). The hue gap carried the whole distinction, so for a
    red-green colour-blind viewer the action button and the LIVE chip — which
    sit side by side — collapsed together.
  - **Magenta was only 69° from gold in hue.** When it was the accent, action
    and status were two warm colours competing. That was never measured at the
    time.
  - Violet clears both axes: 142° of hue and a 1.71 lightness ratio, so the
    pair survives greyscale.
- **The tinted ground is the substantive half of this decision.** A pure-white
  light theme is what every framework gives you by default, and it reads that
  way. Pulling the whole neutral ramp a few points toward the accent hue (RGB
  spread 4–20, hue ~255°) makes the light theme look chosen. It costs nothing
  at runtime and it is invisible as a single swatch — it only works as a system.

## Consequences

- **Tinting the ground darkened it, which cost contrast on the warm statuses.**
  Gold measured 4.56:1 and amber 4.52:1 on the tinted base — over the 4.5 floor
  but far too thin for 9.5px mono labels. Both were darkened: gold `#75590A`
  (5.93:1), amber `#97440A` (6.01:1). **Nothing in either theme now sits under
  5.27:1.** This is the cost of the tint, and it is worth naming: a ground
  change is a contrast change.
- **Indigo collided with a violet accent, so the tertiary fill moved to blue**
  (`#1D4ED8` light, `#7AA2F0` night). A palette change is never only the
  accent — it is every colour that used to sit next to it.
- `primitive.white` now exists as a token distinct from `paper.0`, so that
  "white text on the accent" and "the card surface" can never be confused
  again. In the previous palette they were the same token by accident.
- **Fifth palette, one product.** The re-colour cost one token block per theme
  plus a mechanical remap of fourteen artboards. Structure (ADR-0011) and
  visual language (ADR-0012) untouched for the third palette running. The
  pattern is now established well enough to state as a property of the system
  rather than a run of luck: **because no component names a colour, the accent
  is a one-file decision.**
- Worth recording a process note: two earlier palettes were chosen in
  conversation and both had a measurable defect that nobody saw. The six-option
  page took one turn to build and caught both. **Palette choices get rendered
  and measured from here on, not discussed.**
