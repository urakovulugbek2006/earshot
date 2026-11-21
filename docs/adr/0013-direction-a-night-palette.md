# ADR-0013: Direction A's night palette, cyan accent

**Status:** Accepted · **Date:** 2026-11-21
**Supersedes:** the palette of [ADR-0010](0010-magenta-palette.md) (magenta) —
which had itself superseded [ADR-0009](0009-timurid-palette.md) (turquoise).
The visual language of [ADR-0012](0012-instrument-visual-language.md) and the
information architecture of [ADR-0011](0011-rooms-first-ia.md) are unchanged.

## Context

ADR-0012 adopted Direction A's *surface qualities* — near-black ground, 1px
hairlines, mono numerals, no shadows — but kept the magenta accent from
ADR-0010 and used its own neutral greys. Seeing the original A artboard beside
the result, the owner preferred the original.

The difference was two things: the exact ground values, and the accent. A used
cyan `#22D3EE`; the shipped set used magenta `#FF2E7E`.

## Decision

Adopt Direction A's palette exactly as the **night** theme, and derive a light
theme from it.

- Grounds: `#0A0B0D` base, `#14161A` surface, `#1A1D23` raised, `#23272E`
  hairline — the artboard's own values, not an approximation
- Accent: **cyan `#22D3EE`**, for actions only
- Gold `#F3C84E` keeps meaning *live*; amber `#E0953A` means drifting
- Light theme: grounds on `#F7F8FA`, accent darkened to cyan `#0E7490`

## Rationale

- The owner's aesthetic preference is sufficient on its own. But cyan is also
  the better engineering choice, which is what makes this a cheap decision
  rather than a reluctant one.
- **Cyan has roughly twice the contrast headroom of the magenta it replaces:
  10.9:1 on the night ground against magenta's 5.5:1.** That means it works as
  a fill, as body text, *and* as a 1px accent rule — magenta only ever had
  enough room for the first two. One fewer constraint to design around.
- Cyan against gold and amber reads as a cool/warm split, which maps cleanly
  onto the action/status divide the system already enforces. Magenta against
  gold was two warm hues competing.

## Consequences

- **Light mode needs cyan `#0E7490`, not `#22D3EE`.** The bright cyan measures
  1.9:1 on paper — it is invisible. So the accent *darkens* going to light, the
  reverse of the usual move, which is the same inversion ADR-0012 recorded and
  the reason `text.onAccent` exists as a token.
- The light theme is tighter than the night one. Gold at 4.77:1 and amber at
  4.73:1 clear the 4.5 floor but with little margin, so neither may be used at
  small sizes on `bg.base` without re-checking. The night theme has no pair
  under 5.7:1.
- Both themes were verified programmatically against WCAG AA across eleven
  token pairs each — no failures. The check is worth keeping as a script when
  the Style Dictionary build lands.
- **Fourth palette, one product.** The re-colour cost one token block per
  theme and a mechanical remap of sixteen artboards, because every board draws
  from `var()` and no component names a colour. The structure (ADR-0011) and
  the visual language (ADR-0012) were not touched. That is the three-tier token
  system paying for itself, and it is worth stating plainly: palette churn has
  been cheap *by construction*, not by luck.
- Only A's surface qualities were taken, never its layout. A's left sidebar is
  what made the earlier design read as Spotify (ADR-0011), so the night theme
  sits on the rooms-first skeleton.
