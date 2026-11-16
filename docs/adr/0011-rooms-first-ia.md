# ADR-0011: Rooms-first information architecture

**Status:** Accepted · **Date:** 2026-11-16

## Context

With the full seven-screen flow drawn, the owner's reaction was that it looked
like Spotify. Two palette changes had already been made (ADR-0009, ADR-0010)
and neither addressed it, because colour was never the cause.

The cause was structural. The design had Spotify's skeleton:

1. A left sidebar: Home / Search / Library plus a playlist list
2. Horizontal shelves of square cover-art tiles
3. A full-width player bar docked to the bottom

Those three together are the most recognisable silhouette in consumer audio.
Any palette laid over them reads as a Spotify re-skin.

## Decision

Replace all three, and make the change follow from the product thesis rather
than from a wish to look different.

| Spotify's skeleton | Earshot |
|---|---|
| Left sidebar | **Top navigation**, content full-width |
| Shelves of cover tiles | **Data tables** — number, title, artist, BPM, key, licence, LUFS, length |
| Bottom player bar, owned by the *track* | **Room strip docked to the top**, owned by the *room* |

Home becomes **On air** — a list of live rooms as wide rows, with the catalog
below it. Navigation is renamed to the product's own vocabulary: On air /
Crate / Shelf / Studio.

## Rationale

- **The primary object changed, so the structure had to.** Spotify's primary
  object is the track or playlist, which is why its home screen is shelves of
  artwork. Earshot's primary object is the **room** (ADR-0001). A home screen
  of album tiles was describing a different product.
- **The room strip belongs to the room.** What persists across every screen is
  not "a track is playing" but "you are synchronised with four people at 42ms".
  Moving it to the top and filling it with room state follows from that, and
  incidentally removes the single most Spotify-shaped element on the page.
- **Tables instead of artwork is a positioning choice, not a space saving.**
  Spotify is art-forward. A text-and-numbers table is crate-digging language,
  and it suits a catalog where the listener is choosing by BPM and licence as
  much as by sleeve.

## Consequences

- Cover art loses its role as the primary navigation surface. It still appears
  on track, album and artist pages, but browsing is not driven by it. Accepted:
  a Creative Commons catalog has uneven artwork quality anyway, so leaning on
  it would have been a weakness dressed as a feature.
- Horizontal space is now the constraint rather than vertical. Tables need a
  horizontal scroll container below ~800px, handled per table.
- The vocabulary change (Crate, Shelf, On air) must be used consistently in
  code as well as UI — see the ubiquitous-language section of
  [07-layers-and-ddd.md](../07-layers-and-ddd.md).
- **This decision is independent of the visual language.** That was proved
  immediately: the skin changed once more in
  [ADR-0012](0012-instrument-visual-language.md) while this structure stayed
  exactly as it is.
