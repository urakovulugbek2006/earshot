# Listening Rooms — Technical Design

This is the hardest part of the project and the reason it's worth building.
Read this before week 6; most of the design mistakes here are invisible until
you have four clients on different networks.

---

## The problem

Four people on four networks must hear the same audio sample at the same wall-clock
moment. Working against you:

1. **Clock skew** — client clocks differ by seconds, and `Date.now()` is not monotonic
2. **Variable network latency** — 20 ms to 400 ms RTT, asymmetric
3. **Buffering** — each client needs 1–3 s of HLS buffered before it can play
4. **Clock drift** — audio hardware clocks drift measurably over minutes
5. **Browser throttling** — background tabs get timer-throttled
6. **Reconnection** — a client that drops for 20 s must rejoin mid-track, correctly

**What "synchronized" means for us:** < 250 ms drift for 95% of samples. Below
~50 ms is imperceptible; above ~400 ms is obviously wrong if people are in the
same physical room.

---

## Core decision: the server owns the clock

The naive design makes the host client the source of truth. **Don't.** If the host
closes their laptop, the room dies; the host's buffering stalls everyone; and you
have no way to reconcile conflicting commands.

Instead `social-svc` holds authoritative room state:

```go
type RoomState struct {
    RoomID          string
    Version         uint64    // monotonic; every mutation bumps it
    TrackID         string
    State           string    // "playing" | "paused" | "loading"
    PositionMs      int64     // position at the moment of StartedAtMs
    StartedAtMs     int64     // server monotonic clock, ms
    Queue           []QueueItem
    PermissionMode  string    // "host_only" | "open" | "dj_rotation"
    HostUserID      string
}
```

Every client derives its own target position, rather than being told it:

```
if state == "playing":
    target_position_ms = PositionMs + (server_now_ms() - StartedAtMs)
else:
    target_position_ms = PositionMs
```

This single formula is the heart of the whole feature. Note that it needs no
per-client messages at all once state is known — a room can go minutes without
traffic and still stay in sync.

---

## Clock synchronization (NTP-lite over WebSocket)

Each client must estimate `server_now_ms()`. Standard four-timestamp handshake:

```
client sends:    PING  { t0: client_monotonic_now() }
server replies:  PONG  { t0, t1: server_monotonic_now() }
client receives: at t2 = client_monotonic_now()

rtt    = t2 - t0
offset = t1 - (t0 + t2) / 2
```

**Then `server_now_ms() = client_monotonic_now() + offset`.**

### Three details that matter

1. **Use `performance.now()`, never `Date.now()`.** `Date.now()` jumps when NTP
   corrects the system clock or the user changes timezone. `performance.now()` is
   monotonic.

2. **Take the lowest-RTT sample, not the average.** Offset error is bounded by
   `rtt/2` and is caused by *asymmetric* latency. The sample with the smallest RTT
   had the least opportunity for asymmetry. Collect 8 samples ~200 ms apart on
   join, keep a rolling window of the best 3, use the median of those.

3. **Re-sync every 30 s** with a single sample, and discard any sample whose RTT
   is more than 2× the current best (that's a congestion spike, not information).

---

## Drift correction — the part that makes it feel good

Every 1000 ms the client compares reality to the target:

```
drift = audio.currentTime * 1000 - target_position_ms
```

| |drift| | Action | Why |
|---|---|---|
| < 50 ms | Nothing | Below perception. Correcting here causes audible artifacts. |
| 50–250 ms | Nudge `playbackRate` to `1 ∓ 0.02` until drift < 25 ms, then reset to 1.0 | A 2% pitch shift is ~35 cents — essentially inaudible on music, and it glides back over a few seconds |
| 250 ms – 5 s | Hard seek to target + 150 ms, then wait for `canplay` | Audible but brief. The +150 ms lead accounts for seek latency |
| > 5 s or track mismatch | Full resync: refetch state, reload source | Something went badly wrong |

**Hysteresis is essential.** Without a dead zone you get a control loop that
oscillates and sounds like a skipping record. Also rate-limit hard seeks to at
most one per 5 seconds.

---

## Coordinated start (the buffer barrier)

When the host presses play on a new track, clients have different buffer states.
Starting immediately means the fast client plays while the slow one is silent.

**Two-phase start:**

```
1. Server → all:  PREPARE { track_id, position_ms, start_at_server_ms: now + 1500 }
2. Each client:   loads source, seeks to position_ms, waits for `canplay`,
                  then replies READY { client_id }
3. Each client:   schedules play for (start_at_server_ms - offset), using a
                  coarse setTimeout to ~50 ms before, then a tight
                  requestAnimationFrame spin to hit the exact moment
4. Server:        if all READY arrive early, it may broadcast a revised
                  (earlier) start_at. If a client is still not READY at
                  start_at, it starts late and the drift corrector catches it up.
```

The 1500 ms lead is a tunable. Measure it: log `ready_at - prepare_at` per client
and set the lead to p95 of that distribution. **This is a real measurement you
should take and put in your portfolio write-up.**

Never let one slow client block the room. Degrade that client, don't degrade
everyone.

---

## Scaling WebSockets across replicas

With more than one `social-svc` pod, members of one room land on different pods.

**Chosen approach: Redis Pub/Sub fanout.**

```
pod A receives command → validates → writes authoritative state to Redis
  (atomic, Lua script, version check) → PUBLISH room:{id} <state delta>
all pods subscribed to room:{id} → push to their local connections
```

- Room state lives in Redis (`HASH room:{id}:state`), so any pod can serve it
- Mutations go through a Lua script doing compare-and-set on `version` — this is
  your optimistic concurrency lesson
- Pods subscribe/unsubscribe to `room:{id}` as their first/last local member
  joins/leaves

**Rejected alternative: room affinity via consistent hashing.** Fewer hops and
no Redis in the hot path, but it needs a coordination layer and makes rolling
deploys painful. Note it in an ADR as a known scaling path.

**Rejected alternative: sticky sessions by room ID at the ingress.** Traefik can
do this, but it couples routing to application semantics and breaks when you
scale down.

---

## Presence

```
ZADD room:{id}:members <unix_ms_now> <user_id>     # on heartbeat (every 10s)
ZRANGEBYSCORE room:{id}:members (now-30000) +inf   # live members
ZREMRANGEBYSCORE room:{id}:members -inf (now-30000) # reaper, every 15s
```

A sorted set keyed by last-seen timestamp gives you presence, TTL eviction, and
a "who's been here longest" ordering for free. Run the reaper from a single
leader pod (Redis lock) so you don't broadcast N duplicate leave events.

**Distinguish "disconnected" from "left".** A 10-second network blip should not
remove someone from the member list — show them as "reconnecting" for 30 s.

---

## Reconnection

Client stores the last `version` it saw. On reconnect:

```
client → RESUME { room_id, last_version }
server → if gap is small:  DELTAS [ ... ]
         if gap is large or version unknown:  SNAPSHOT { full RoomState }
```

Then redo the clock-sync handshake from scratch — the offset is stale and
possibly wrong (the client may have changed networks entirely).

Client-side backoff: 250 ms, 500 ms, 1 s, 2 s, 4 s, 8 s, capped at 30 s, with
±20% jitter. Never a fixed interval — that's how you build a thundering herd
against your own server.

---

## Permission modes

| Mode | Who can control playback | Who can queue |
|---|---|---|
| `host_only` | Host | Host |
| `open` | Anyone | Anyone |
| `dj_rotation` | Current DJ (rotates each track) | Anyone, into their own slot |

Authorize **server-side on every command**. The client hiding a button is UI, not
security — this is the most likely place for an authorization bug in the whole
project, so write explicit tests for "a non-host sends a skip command".

Rate limit per user per room: 10 playback commands / 10 s, 20 chat messages / 60 s.

---

## Testing it

This is the most interesting test suite in the project.

**Multi-client E2E (Playwright)**
```
- launch 4 browser contexts
- all join the same room
- host plays a track
- wait 10 s
- read audio.currentTime from all 4 via page.evaluate()
- assert max - min < 250 ms
```

**Network-degraded variant**
```
- apply CDP Network.emulateNetworkConditions to contexts 3 and 4
  (3G: 400 ms latency, 400 kbps)
- same assertion, relaxed to < 400 ms
- assert the fast clients were NOT degraded
```

**Chaos cases**
- Kill a `social-svc` pod mid-playback → clients reconnect, sync holds
- Partition one client for 20 s → it rejoins at the correct position
- Two users send conflicting skips in the same 10 ms → exactly one wins,
  version increments by exactly 1
- Host leaves → host migrates to the longest-present member

**Load (k6 + a WS script)**
- 50 rooms × 10 clients = 500 concurrent WS connections
- Measure: fanout latency p99, memory per connection, CPU at idle

**Metrics to export (and put in a Grafana panel)**
- `room_sync_drift_ms` histogram, labelled by room size
- `clock_offset_rtt_ms` histogram
- `coordinated_start_ready_latency_ms` histogram
- `room_hard_seeks_total` counter — if this is high, your lead time is wrong
- `ws_connections_active` gauge

---

## Things that will bite you

1. **Browser autoplay policy.** Audio won't start without a user gesture. A late
   joiner needs a "Join playback" button that performs the first `play()` inside
   a click handler. Design for this in the UX, don't bolt it on.
2. **Background tab throttling.** `setTimeout` is clamped to ≥1 s in background
   tabs. Your drift corrector stops running. Use an `AudioWorklet` or
   `Web Audio`-driven tick, or accept drift and resync hard on `visibilitychange`.
3. **iOS Safari.** Separate volume control is impossible, audio session handling is
   idiosyncratic, and `playbackRate` nudging behaves differently. Test on a real
   device, not the simulator.
4. **HLS segment boundaries.** Seeking lands on keyframe/segment boundaries, so
   your seek granularity is the segment duration. Use **2-second segments** in the
   transcode ladder specifically to make room sync feasible — a 10 s segment length
   would make this feature impossible. *This is a week-3 decision that determines
   whether week 6 works, which is exactly why architecture-first matters.*
5. **`audio.currentTime` precision** varies by browser (some quantize to ~20 ms,
   some to the buffer size). Don't chase drift below your measurement precision.
