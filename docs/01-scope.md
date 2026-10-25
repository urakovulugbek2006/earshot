# Scope (MoSCoW)

The purpose of this document is to be the thing you point at when you're tempted
to add something in week 5.

## Must have — if these don't ship, the project failed

**Identity**
- Email+password registration with verification, login, logout
- JWT access (15 min) + rotating refresh token in httpOnly cookie
- OAuth: one provider (Google)
- Password reset

**Catalog**
- Artists, albums, tracks, genres, tags
- ~2,000 Creative Commons tracks seeded from Jamendo with correct attribution
- User upload → transcode → publish pipeline
- Artist, album, track detail pages

**Playback**
- HLS adaptive streaming, 3 renditions
- Play/pause/seek/next/prev, shuffle, repeat-one, repeat-all
- Queue management (add next, add to end, reorder, clear)
- Cross-device resume
- Keyboard shortcuts + OS media keys

**Library**
- Like/unlike tracks, follow artists
- Create/edit/delete playlists, add/remove/reorder tracks
- Recently played

**Search**
- Typo-tolerant search over tracks, artists, albums, playlists
- Faceted filtering by genre

**Listening rooms (the thesis)**
- Create room, share invite link, join
- Server-authoritative synchronized playback, drift < 250ms
- Shared queue with host-only and open permission modes
- Presence list, live chat
- Graceful reconnect and late-join

**Platform**
- Observability: traces, metrics, logs for every request
- CI/CD to production
- Backups with a proven restore
- TLS, security headers, rate limiting
- WCAG 2.1 AA on all Must-have screens

## Should have — ship if the weeks allow

- Collaborative playlists
- Artist analytics dashboard (plays, geography, skip points)
- Tag-based recommendations ("made for you")
- Admin moderation queue for uploads
- Dark + light theme (build tokens for both from day one, even if light ships later)
- i18n scaffolding with one second language
- Email notifications (new follower, room invite)
- DJ-rotation room mode
- Waveform scrubbing UI
- Charts / trending derived from ClickHouse

## Could have — stretch weeks only

- Mobile app (Expo) with offline downloads
- Collaborative-filtering recommendations
- Stripe subscriptions in test mode
- Time-synced lyrics
- Crossfade and true gapless playback
- Feature flags + an A/B test
- Social graph feed ("your friends are listening to…")
- Podcast support

## Won't have — explicitly out of scope

- **Any commercially licensed music.** Non-negotiable, legal.
- Video content
- Real payment processing (test mode only, if at all)
- Native iOS/Android (Swift/Kotlin)
- Multi-region / geo-distributed deployment
- Real DRM (Widevine/FairPlay) — we do token-gated delivery and document the gap
- Live radio / live streaming from a mic
- Ads
- Any kind of AI music generation

## Scope tripwires

If any of these happen, cut something from Should-have immediately:

- Week 3 ends without a working transcode pipeline
- Week 4 ends and playback still has audible glitches
- Week 6 starts and rooms haven't been designed in detail
- Week 7 starts and there is no CI pipeline running tests
