# ADR-0012: Instrument visual language, dark as the primary theme

**Status:** Accepted · **Date:** 2026-11-16
**Supersedes:** the visual language of [ADR-0008](0008-design-direction.md) —
Direction C's hard 2px borders, offset shadows, zero radius and light-first
theme. The palette from [ADR-0010](0010-magenta-palette.md) is retained.
The information architecture from [ADR-0011](0011-rooms-first-ia.md) is
unchanged.

## Context

Three directions were explored in week 0. Direction A ("Studio") — near-black,
Inter plus JetBrains Mono, hairline borders, a single accent, technical data
exposed as content — was set aside in ADR-0008, partly because dark plus
art-forward is the Spotify convention.

Having seen the full flow, the owner preferred A. The objection in ADR-0008 no
longer holds: after ADR-0011 the anti-convention work is carried by the
*structure* (top nav, rooms first, data tables), so the skin is free to be dark.

## Decision

Direction A's visual language, applied to the ADR-0011 skeleton.

| | Direction C (was) | Instrument (now) |
|---|---|---|
| Ground | warm off-white | near-black `#0B0B0D`, dark **primary** |
| Borders | 2px ink | **1px hairline** `#24242B` |
| Shadows | hard 4px/7px offset | **none at all** |
| Radius | 0 | 3px |
| Type | Archivo | Inter + **JetBrains Mono on every number** |
| Accent | `#C2185B` | `#FF2E7E` on dark, `#C2185B` on light |

## Rationale

- **A's real strength is its attitude to data, and the new skeleton is built
  for data.** On the original A artboard the technical readouts sat beside a
  large cover; on a rooms-and-tables skeleton they become the content. The two
  decisions reinforce each other, which neither did on its own.
- **It makes the thesis measurable on screen.** Per-listener drift in the room
  panel, a Room sync panel (max drift, clock RTT, corrections/min, hard seeks),
  `SYNC / BUF / AAC` in the room strip, LUFS beside BPM in the crate. These are
  the same metrics that go to Grafana in week 8
  ([04-listening-rooms-design.md](../04-listening-rooms-design.md)), so the UI
  and the observability stack describe the system in the same terms.
- **Mono numerals are functional, not stylistic.** Tabular figures stop a value
  that updates every second from making its row jitter, and keep table columns
  aligned. Hence a `data` typography role in `tokens.json`, separate from `body`.

## Consequences

- **Dark is the primary theme and light is secondary**, reversing ADR-0008.
  `theme.css` now carries dark on `:root` and applies light under
  `[data-theme="light"]` or `prefers-color-scheme: light` — the reverse of the
  usual arrangement, deliberately.
- The accent lifts to `#FF2E7E` on dark: `#C2185B` measures 3.27:1 against
  `#0B0B0D` and is unreadable. The light theme keeps `#C2185B` at 5.9:1. Gold
  likewise splits — `#F3C84E` on dark, `#8A6A08` on light, where the brighter
  gold is 1.7:1 and unusable for text.
- **Shadows are removed from the system entirely.** Depth now comes from the
  ground / surface / raised steps plus hairlines. A `box-shadow` in a component
  is a bug; `tokens.json` says so where the shadow tokens used to be.
- Hairlines at 1px are fragile: they disappear under low-contrast displays and
  at some zoom levels. Mitigated by the three-step background scale doing most
  of the separation, with the hairline as reinforcement rather than the only
  cue.
- Visual controls shrank to 36px in the nav and room strip. The 44px WCAG hit
  area is preserved by padding, enforced in `theme.css` base rules rather than
  per component.
- **Third visual language, one product.** The structure has now survived two
  palettes and two skins, which is the signal that the three-tier token system
  is doing its job. The owner's remaining aesthetic calls cost a token file and
  a re-colour, not a redesign.
