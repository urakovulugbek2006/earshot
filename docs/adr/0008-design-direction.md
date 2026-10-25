# ADR-0008: Direction C ("Signal") as the design system, light and dark

**Status:** Accepted · **Date:** 2026-10-25

## Context

Three visual directions were built as working artboards of the same screen
(Now Playing with an active listening room) so they could be judged on equal
content rather than on how much detail each mockup happened to contain.

## Options considered

1. **A — Studio.** Near-black, Inter + JetBrains Mono, single cyan accent,
   hairline borders, technical data (BPM, key, buffer, latency in ms) exposed
   as content. Reads as a pro audio tool.
2. **B — Lounge.** Ink-plum ground, Instrument Serif display at 58px, brass
   accent, 18px radii, soft shadows. Reads as a late-night listening club.
3. **C — Signal.** Warm off-white, Archivo 800, 2px black borders, hard offset
   shadows, flat colour blocks, members as named chips. Reads as a social
   product.

## Decision

Direction C, with a dark theme built from day one rather than retrofitted.

## Rationale

- **It matches the thesis.** ADR-0001 chose social listening; C is the only
  direction where the *people* are the visual subject. A and B both make the
  album art the subject, which is what a solo-listening product should do.
- **It is the only one that doesn't read as a Spotify clone.** Dark + large
  album art is the convention; following it means the work looks familiar
  rather than distinctive, which costs the project its portfolio value.
- **It is the easiest to keep consistent solo.** Flat fills and 2px borders
  have far fewer degrees of freedom than soft shadows, blur radii and
  gradients. A one-person team will drift on a system with many continuous
  parameters; this one has almost none.
- **Accessibility comes close to free.** High contrast is structural here, not
  something to audit for later. The week 7 WCAG 2.1 AA pass gets much cheaper.
- **It handled a real state the others hid.** All three mockups included a
  member who had dropped off. Only C showed it honestly, as
  "+1 reconnecting" — A used a dashed `+1`, B folded it into an overflow
  count. A 10-second network blip must not look like someone left the room
  (`04-listening-rooms-design.md`), so the honest treatment is the correct one
  and would have had to be back-ported into A or B anyway.

## Consequences

- **Light is the primary theme, which is unconventional for a music app and
  needs defending.** Music apps are dark for real reasons: low-light
  listening, and album art pops against black. So dark is a first-class
  theme, not an afterthought — both are specified in `design/tokens.json`
  from the start, and both are reviewed before any component is built.
- The dark theme is **not** an inversion. `border-strong` flips to a *light*
  value to keep the 2px edge language visible, and `accent` lightens from
  `blue-600` to `blue-400` because the darker blue measures ~3.1:1 on the dark
  ground — below the 4.5:1 floor. Recorded in `design/README.md`.
- **No soft shadows anywhere.** Hard offset, zero blur, shadow colour taken
  from a theme token so it flips with the theme. This constraint is the system;
  breaking it once breaks the whole look.
- The radius scale is deliberately tiny (`0`, `2px`, `full`). A rounded corner
  is an exception requiring a reason, not a default.
- Archivo 800 at 50px is a strong voice. It will not suit every screen — long
  text (licence terms, artist bios, legal pages) needs a quieter heading role,
  which is why `heading.sm` exists in the type scale.
- A lint rule in week 2 fails the build on a raw hex in a component, because
  the dark theme only works if every colour goes through a semantic token.
