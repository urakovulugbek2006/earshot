# ADR-0010: Magenta as the brand colour

**Status:** Accepted · **Date:** 2026-11-16
**Supersedes:** [ADR-0009](0009-timurid-palette.md). Direction C's *structure* —
hard 2px borders, flat colour, zero blur, light as the primary theme — still
stands, from [ADR-0008](0008-design-direction.md).

## Context

ADR-0009 set the brand colour to the Timurid turquoise `#0099B5`. Seen applied
across the full seven-screen flow, the owner rejected it and asked for
something that reads as *music*.

That is a legitimate and sufficient reason on its own — a brand colour the owner
does not want to look at for two months is the wrong brand colour. But the
turquoise also carried a real constraint worth recording, because it is what
makes the replacement an improvement rather than a swap.

## Options considered

1. **Deep magenta `#C2185B`** — vinyl label, club signage, Deezer/Apple Music territory
2. **Sodium amber `#D97706`** — VU meters, tube glow, analogue warmth
3. **Acid green `#84CC16`** — energetic, but reads as Spotify
4. **Electric violet `#7C3AED`** — night, bass, club

## Decision

Option 1, `#C2185B`. Gold `#F3C84E` is retained for live state; terracotta and
lapis are replaced by amber `#B45309` and indigo `#4338CA`.

## Rationale

- **It reads as music** without reading as a specific competitor. Acid green
  (option 3) would have read as a Spotify clone, which costs the project the
  distinctiveness ADR-0001 exists to create.
- **It removes the turquoise's constraint.** `#0099B5` measured 3.37:1 on white
  — below the 4.5:1 floor — so it could never carry white text and could never
  be used as a text colour. It was a fill and nothing else, which meant a
  second token (`accent.text`) existed out of necessity rather than choice.
  `#C2185B` is 5.9:1: usable as a fill carrying white text *and* as text on the
  light ground. One fewer rule to hold in your head while building.
- **Option 2 was rejected for exactly that reason.** Amber `#D97706` is 3.19:1
  on white — it would have reproduced the turquoise's limitation. The most
  "analogue" option was the one that repeats the known mistake.
- Warm off-white ground plus magenta plus gold is a record-sleeve palette with
  long precedent, so the supporting colours were not arbitrary.

## Consequences

- **The accent's text colour now inverts between themes.** Light mode:
  `#C2185B` with white text. Dark mode: `#F472B6` with near-black text, because
  the lighter pink fails with white. The previous palette had near-black on
  accent in *both* themes. Recorded as rule 3 in `design/README.md`; the
  `text.onAccent` token is what keeps components from caring.
- The dark ground moves from cool blue-black (`#0F1417`) to neutral plum
  (`#15131A`) — a cool ground under magenta reads cold. The `slate` primitive
  family is renamed `plum`; `sand` still owns the light theme.
- **Warn moved from terracotta to amber.** Terracotta `#D9542B` sat in the same
  hue region as the magenta brand, so an error and a primary action would have
  looked related. Amber is clearly separate. Note that the design labels states
  in words ("reconnecting", "Failed") rather than by colour alone, so this is
  about clarity, not about colour being load-bearing.
- One inconsistency was found and fixed while re-colouring: the room header was
  the accent colour in light mode but gold in dark. It is **gold in both** now,
  which also established the magenta-for-actions / gold-for-live split recorded
  in `design/README.md`.
- Every artboard and both token files were re-coloured; `tokens.json` and
  `theme.css` were updated before the artboards, and verified so that every
  `var()` resolves and every `{primitive.*}` reference exists.
- This is the second palette change. If a third is wanted, the structure
  survives it — that is what the three-tier token system is for. But the
  *structure* has now been stable across two palettes, which is the signal that
  matters.
