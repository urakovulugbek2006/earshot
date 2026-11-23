# ADR-0015: Violet grounds, and no white in the system

**Status:** Accepted · **Date:** 2026-11-23
**Supersedes:** the ground values of
[ADR-0014](0014-violet-tinted-grounds.md). Its accent choice (violet) and its
reasoning about separating from gold both stand.

## Context

ADR-0014 tinted the neutral ramps toward the accent hue, giving a light ground
of `#F4F2F9` and a card surface of `#FBFAFE` — an RGB spread of 7 and 4.

Shown the result, the owner's response was that the background was still white.
They were right. A 7-point spread is measurable but not **visible**: it shows up
in a diff, not to an eye. The decision was correct in direction and wrong in
magnitude.

## Decision

Go to grounds that are unmistakably violet, and remove white from the system
entirely.

| | ADR-0014 | Now | Spread |
|---|---|---|---|
| Light ground | `#F4F2F9` | **`#E6DEF7`** | 7 → **25** |
| Light surface | `#FBFAFE` | **`#F1EBFB`** | 4 → **16** |
| Light hairline | `#DDD8EC` | **`#C9BBE8`** | 20 → **45** |
| Night ground | `#0A0A0F` | **`#0D0916`** | 5 → **13** |

**There is no white token any more.** `primitive.white` is deleted. The colour
used for text and icons *on* the accent is `paper.0` (`#F1EBFB`), a pale
lavender. Nothing in either theme is `#FFFFFF`.

## Rationale

- **A tint you have to measure is a tint nobody sees.** That is the whole
  lesson, and it is worth keeping: when the intent is "this ground is
  deliberate", the signal has to clear perception, not just a contrast checker.
  ADR-0014's ramp satisfied the *description* of the technique while failing its
  *purpose*.
- Deleting the white token is not decoration. While it existed, any component
  could reach for "white" and quietly reintroduce the thing the palette exists
  to avoid. With no such token, that mistake is unavailable.

## Consequences

- **A lavender ground is darker than white, so several colours moved down**:
  gold `#75590A` (5.07:1), amber `#954309` (5.24:1), error `#9E2B22` (5.72:1),
  accent `#5B21B6` (6.91:1). The muted text colour also darkened to `#5A5170`.
  Nothing in either theme sits under 5.07:1.
- **The accent/gold lightness collision came back and had to be re-tuned.**
  Darkening the accent for the lavender ground pulled it toward gold: the first
  gold candidate (`#6B5108`) gave a lightness ratio of **1.20** against it — the
  same defect that disqualified teal in ADR-0014, reappearing for a different
  reason. Gold was re-tuned to `#75590A` for a ratio of 1.36.
- **That window is narrow and should be treated as a constraint, not a value.**
  Gold has to be dark enough to read on lavender *and* light enough to separate
  from a dark violet accent. Three steps either way breaks one of the two. Any
  future change to the light ground must re-check this pair specifically.
- The accent-comparison board keeps its neutral ground on purpose — comparing
  six accents fairly needs a neutral field, and it is a record of a decision
  rather than a screen of the product. Its title says so.
- Sixth palette iteration; structure (ADR-0011) and visual language (ADR-0012)
  still untouched. Light and night were both re-coloured from one token block
  each plus a mechanical pass over fourteen artboards.
