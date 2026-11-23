# Earshot design system

Violet accent on **violet grounds**, on a rooms-first information
architecture. There is no white in this system. **Night is the primary theme;
light is secondary.**

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
| `accent` | `#A78BFA` | `#5B21B6` | **Actions only** — play, publish, join, sign in |
| `status.live` | `#F3C84E` | `#75590A` | **Means live** — in-sync chip, on-air rooms |
| `status.warn` | `#E0953A` | `#954309` | Drifting, reconnecting |
| `status.error` | `#F0564A` | `#9E2B22` | Failed jobs |
| `status.info` | `#8AA8F5` | `#1B45C4` | Tertiary fills |
| `bg.base` | `#0D0916` | `#E6DEF7` | Ground — **violet**, not grey |
| `bg.surface` | `#17122A` | `#F1EBFB` | Lightest surface — **and the on-accent text** |
| `border.hair` | `#2C2442` | `#C9BBE8` | The 1px signature |

### The grounds are violet, and there is no white token

Both ramps are violet, not neutral: light ground `#E6DEF7` (RGB spread 25),
night ground `#0D0916` (spread 13). **`primitive.white` does not exist.** The
colour used on the accent is `paper.0` — pale lavender `#F1EBFB`.

An earlier version (ADR-0014) tinted the ramps by only 4–7 points. It passed
every checker and still read as white. **A tint you have to measure is a tint
nobody sees.** Deleting the white token is what stops a component quietly
reintroducing it.

**Cyan is for actions. Gold is for live state. Amber is for drifting.** A
header is not a button; if everything clickable and everything live share a
colour, neither means anything. Cyan against gold/amber is also a cool/warm
split, which makes the action/status divide legible at a glance.

## Files

| File | Role |
|---|---|
| `tokens.json` | **Source of truth.** DTCG. `primitive` → `semantic` → scales. |
| `../packages/tokens/build.mjs` | The build. ~100 dependency-free lines. |
| `../packages/tokens/dist/theme.css` | Generated. Not committed; CI regenerates and compares. |

Run `pnpm tokens` after changing a token. The build is also the test — it fails
on an unresolved reference, on a semantic token missing from one theme, and on
any token holding pure white. Not Style Dictionary: that earns its keep across
several output platforms, and we emit one. See
[docs/10-local-setup.md](../docs/10-local-setup.md).

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
6. **There is no white.** No token holds `#FFFFFF`, in either theme. If a
   component writes a white background *or* white text, it is a bug.

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
| `text-primary` on `bg-base` | 16.9:1 | 14.3:1 |
| `text-secondary` on `bg-base` | 11.1:1 | 8.9:1 |
| `text-muted` on `bg-base` | 5.7:1 | 5.7:1 |
| `accent` as text on `bg-base` | 7.2:1 | 6.9:1 |
| `text-on-accent` on `accent` | 6.8:1 | 7.7:1 |
| `status.live` as text on `bg-base` | 12.4:1 | 5.1:1 |
| `status.warn` as text on `bg-base` | 8.0:1 | 5.2:1 |

**Nothing in either theme sits under 5.07:1.** The light values are darker than
a white-ground theme would need, because a lavender ground is darker than white
and costs contrast.

### The accent must separate from gold side by side

Violet and gold appear next to each other in the room strip, so the pair is
checked on two axes, not one. Night: **149° of hue, 1.71 lightness ratio.**
Light: **141° and 1.36.**

The light pair had to be tuned for it. Darkening the accent to hold on the
lavender ground pulled it toward gold — the first candidate fell to a **1.20**
ratio, the same defect that disqualified teal. Gold has to be dark enough to
read on lavender *and* light enough to separate from the accent, and that window
is about three steps wide. **Any future change to the light ground must
re-check this pair.**

## Touch targets

Visual controls are 36px in the top nav and room strip, which is denser than
44px. The WCAG 2.1 AA hit area is preserved by padding and enforced in
`theme.css` base rules, not per component — so a dense control cannot
accidentally ship with a small hit area.

## Figma

`tokens.json` maps 1:1 onto Figma variable collections: `primitive`,
`semantic` (Dark and Light modes), `scale`.
