# ADR-0009: Timurid turquoise as the brand colour

**Status:** Accepted · **Date:** 2026-11-16
**Supersedes:** the palette decision in [ADR-0008](0008-design-direction.md).
Direction C's *structure* — hard 2px borders, flat colour, zero blur, light as
the primary theme — stands unchanged.

## Context

ADR-0008 selected Direction C with a generic blue accent (`#1D4ED8`) chosen for
contrast properties rather than for meaning. A brand colour that means nothing
is a missed opportunity, and the project has an owner with a specific cultural
reference available.

## Decision

The brand colour becomes **`#0099B5`** — the turquoise (*ko'k*) of the standard
of Amir Temur, the same blue the flag of Uzbekistan takes from it. Gold
(`#F3C84E`), terracotta (`#D9542B`) and lapis (`#2B4C9B`) are drawn from
Timurid tilework and replace the previous lime, orange and sky.

The logo mark becomes the **three rings of the Timurid banner**, replacing a
generic square.

## Rationale

- A brand colour that carries meaning is better than one picked for its hex
  value, and it costs nothing to choose the meaningful one.
- The supporting hues are not invented: turquoise, gold, terracotta and lapis
  genuinely co-occur in Timurid tilework, so the palette is coherent by
  derivation rather than by taste.
- Lime next to turquoise read as an accident. Gold next to turquoise is a
  relationship with 600 years of precedent.
- The three-ring mark is distinctive, trivially reproducible at any size in
  two colours, and it means something.

## Consequences

- **`#0099B5` cannot carry white text.** It measures **3.37:1** on white —
  below the 4.5:1 floor. This is the significant constraint the previous blue
  did not impose, and it changes how the colour is used: turquoise is a **fill
  that carries near-black text**, never a text colour. Links and small text use
  `accent.text` (`#00707F`, 5.8:1). Recorded as rule 3 in `design/README.md`.
- **The dark ground changes hue**, from warm sand (`#13120E`) to cool blue-black
  (`#0F1417`). A warm dark ground under a turquoise accent goes muddy. This adds
  a `slate` primitive family alongside `sand`; `sand` keeps the light theme.
- Dark-mode accent is `#22C3DB` (8.9:1 on the dark ground), since `#0099B5`
  measures ~3.1:1 there.
- Every artboard was re-coloured. `design/tokens.json` and `design/theme.css`
  are the source of truth and were updated first.
- Risk accepted: a turquoise-and-gold palette is more distinctive than a blue
  one, which cuts both ways. If it reads as decorative rather than functional in
  use, the structure survives a palette change — that is precisely what the
  three-tier token system is for.
