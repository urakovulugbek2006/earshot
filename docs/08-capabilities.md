# What Earshot can do

The capability list, in user terms. This is the "what" — `01-scope.md` is the
"what we refuse to build and why", and the two must agree.

**M** = Must have, ships or the project failed. **S** = Should have, ships if
the weeks allow. Week numbers say when it gets built.

---

## 1. Account and identity — week 2

| | Capability |
|---|---|
| M | Sign up with email and password, confirm via an emailed link |
| M | Sign in with Google in one click |
| M | Stay signed in across devices; sign out of one device or all of them |
| M | Reset a forgotten password |
| M | Change display name and avatar |
| S | Export everything you have ever done, as a file |
| S | Delete your account, and have it actually cascade |

## 2. Finding music — weeks 3 and 5

| | Capability |
|---|---|
| M | Search tracks, artists, albums and playlists — tolerates two typos, answers in under 100ms |
| M | Filter results by genre |
| M | Browse an artist: their tracks, albums and real listen counts |
| M | Browse an album, and a genre or tag |
| M | A home page: recently played, new releases, charts |
| S | "Made for you" — recommendations from the tags of what you actually play |
| S | Trending and top charts computed from the event stream, not a counter column |

## 3. Listening — week 4

| | Capability |
|---|---|
| M | Play any track, at a quality that adapts to your connection as it changes (64 / 128 / 256 kbps) |
| M | Play, pause, next, previous |
| M | Seek by dragging across the waveform, not a flat bar |
| M | Shuffle, repeat-one, repeat-all |
| M | Volume on a perceptual curve, so halfway sounds like halfway |
| M | See the queue; add-next, add-to-end, drag to reorder, remove, clear |
| M | **Pause on your laptop, open your phone, press play, and land on the same second** |
| M | Control it from your keyboard — every action, no mouse needed |
| M | Control it from OS media keys and your phone's lock screen, with artwork |
| M | See each track's licence and attribution — a Creative Commons requirement, not a nicety |
| S | Crossfade and true gapless transitions |

## 4. Your library — week 5

| | Capability |
|---|---|
| M | Like and unlike tracks; browse everything you've liked |
| M | Follow and unfollow artists |
| M | Create, rename and delete playlists |
| M | Add, remove and drag-reorder tracks in a playlist |
| M | Recently played history |
| S | Collaborative playlists — invite people to add to yours |

## 5. Listening rooms — week 6, the reason this project exists

| | Capability |
|---|---|
| M | Create a room and get a link to share |
| M | Join from a link; see everyone in the room **by name** |
| M | **Everyone hears the same moment, within 250ms of each other** |
| M | See live sync status, e.g. "in sync · 42ms" |
| M | A shared queue the room adds to together |
| M | Three control modes: host-only, open to everyone, or DJ rotation (turns) |
| M | Live chat |
| M | Join a room mid-track and land at the right position, not at zero |
| M | Lose your connection for twenty seconds and rejoin without the room noticing |
| M | **Be shown as "reconnecting", not as having left** — a network blip is not an exit |
| S | Host migration — if the host leaves, the room survives |
| S | Reactions |

## 6. Uploading and publishing — week 3

| | Capability |
|---|---|
| M | Upload audio: MP3, FLAC, WAV or M4A |
| M | Resumable uploads, so a dropped connection doesn't restart a 40MB file |
| M | Automatic processing: three streaming qualities, waveform, artwork resized — all within about 30 seconds |
| M | Edit a track's metadata and choose its licence |
| M | Publish and unpublish |
| S | Your own stats: plays over time, where listeners are, **where in the track people skip** |

## 7. Admin and moderation — weeks 3 and 8

| | Capability |
|---|---|
| M | A review queue for new uploads |
| M | Take down a track |
| S | Suspend an account |
| M | All of it reachable only over WireGuard — the admin plane is never on the public internet |

## 8. True of every screen

| | Capability |
|---|---|
| M | Light and dark theme, both designed, neither an afterthought |
| M | Fully keyboard navigable, screen-reader supported — WCAG 2.1 AA |
| M | Works at phone width in a browser |
| S | A second language |
| S | Email notifications: new follower, room invite |

---

## What it deliberately cannot do

Stated so nobody wonders whether we forgot.

| Not building | Why |
|---|---|
| Stream commercial music | Per-territory licensing costs millions. Catalog is Creative Commons plus creator uploads. [ADR-0003](adr/0003-catalog-source.md) |
| Video | Out of scope; doubles the media pipeline |
| Real payments | Stripe **test mode** at most, and only as stretch |
| A native iOS/Android app | Web first. An Expo app is stretch scope |
| Offline downloads | Stretch, and only with the Expo app |
| Ads | No |
| AI music generation | No |
| Real DRM (Widevine/FairPlay) | Needs a licence server and platform agreements — and the catalog is licensed to be shared. We use short-lived signed URLs and document the gap honestly. [ADR-0006](adr/0006-audio-delivery.md) |
| Multi-region deployment | One server. Documented as a limitation, not solved |

---

## The five that are worth the whole project

If only these work, it was still worth building:

1. **Four people on four networks hearing the same second.** Nothing else here is hard in the same way.
2. **Drop an MP3 in, get a playable adaptive stream out, in thirty seconds.**
3. **Pause on one device, resume on another, mid-track.**
4. **Reconnect into a live room and land in the right place.**
5. **It's live on a real server you administer, with backups you have actually restored from.**
