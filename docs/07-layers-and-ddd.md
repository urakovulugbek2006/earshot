# Layers, Controllers and DDD — what we actually use

The vocabulary (controller, service, domain, repository, aggregate) comes from
two related but different ideas that get mixed up constantly:

- **Layered architecture** — *where code goes.* Mechanical, always worth doing.
- **Domain-Driven Design** — *how you model the business.* A philosophy, worth
  doing **in some places and not others.**

This document says which parts of each we use, where, and why we deliberately
skip the rest. Read it before week 2.

---

## Part 1 — The one idea underneath all of it

> **Business rules should not know how the computer works.**

"Only the host can skip a track when the room is in host-only mode" is a rule
about *Earshot*. It has nothing to do with HTTP, Postgres, Redis or JSON. If
that rule lives inside a WebSocket handler, you cannot test it without a
WebSocket, you cannot reuse it from an admin endpoint, and you will eventually
have two copies that disagree.

Everything below is machinery for keeping that rule in one place, expressed in
plain Go or TypeScript, with no infrastructure anywhere near it.

---

## Part 2 — The four layers

From the outside in. The names in brackets are what other people call the same
thing — the inconsistency is real, not something you're misunderstanding.

### 1. Transport layer — *controller* / handler / route / resolver

Speaks a protocol. HTTP, gRPC, WebSocket. Its entire job:

1. Parse the incoming bytes
2. Check the **shape** is valid (is `roomId` a string? is it present?)
3. Call **one** thing in the application layer
4. Map the result to a status code or response frame

**A controller contains zero business rules.** If yours is longer than about
15 lines, a rule has leaked into it. "Is this a valid UUID" is shape. "Is this
user allowed to skip" is a rule — that belongs inward.

In NestJS this is a class marked `@Controller()`. In Go there is no such
convention; you write a `handler` function. Same layer, different word.

### 2. Application layer — *use case* / application service / command handler

One file per thing a user can *do*: `SkipTrack`, `JoinRoom`, `PublishTrack`,
`CreatePlaylist`. It orchestrates:

- Opens the transaction
- Loads what it needs through repositories
- Calls the domain to make the decision
- Saves, and records the resulting events

It holds **workflow**, not **rules**. "Load the room, ask it to skip, save it,
publish the delta" is workflow. "Only the host may skip" is a rule.

### 3. Domain layer — the actual business

Plain objects with plain methods. **No SQL, no HTTP, no Redis, no JSON tags,
no framework imports.** You can unit-test this layer with no database, no
Docker, and no network — which is exactly why it is worth separating.

This is where DDD's vocabulary lives (Part 3).

### 4. Infrastructure layer — *adapters*

The real implementations: the Postgres repository, the Redis client, the MinIO
uploader, the Kafka producer, the ffmpeg wrapper.

### The dependency rule — the part that matters

> **Dependencies point inward. The domain depends on nothing.**

```
transport ──→ application ──→ domain ←── infrastructure
                                 ↑
                      everything points here;
                      this points nowhere
```

Notice infrastructure's arrow points **inward**, which looks backwards — the
Postgres code depends on the domain, not the reverse. That's **dependency
inversion**, and it works because the *domain declares the interface it needs*
and infrastructure implements it:

```go
// internal/domain/room.go — the DOMAIN owns this interface
type RoomRepository interface {
    FindByID(ctx context.Context, id RoomID) (*Room, error)
    Save(ctx context.Context, r *Room) error
}
```

```go
// internal/adapters/redisrepo/room.go — infrastructure IMPLEMENTS it
type RoomRepo struct { client *redis.Client }
func (r *RoomRepo) FindByID(...) (*domain.Room, error) { /* Lua, CAS, decode */ }
```

The domain file imports nothing but the standard library. That is the test:
**open any file in `domain/` — if it imports a database driver, the layering is
broken.**

---

## Part 3 — DDD vocabulary, with Earshot examples

### Entity — identity survives change

An object whose identity persists even as its values change. A `Track` renamed
from "Transit Pattern" to "Transit Pattern (Remaster)" is still the same track.
**Identity is the ID, not the values.** Two entities are equal when their IDs
match.

Earshot: `Track`, `Artist`, `User`, `Playlist`, `Room`.

### Value object — no identity, defined entirely by its values

Immutable. Two value objects with the same values *are* the same thing — there
is no "which one". `Duration(214s)` is `Duration(214s)`, full stop.

This is the **most underused good idea in DDD**, and it's nearly free:

| Earshot value object | Instead of | What it buys |
|---|---|---|
| `Duration` | `int` seconds | Can't accidentally add a duration to a bitrate |
| `QueuePosition` | `string` | The fractional-index rules live *in* the type |
| `Licence` | 3 loose string fields | Attribution can't be constructed without a source URL |
| `ClockOffset` | `int64` ms | Can't confuse an offset with a timestamp |
| `Bitrate` | `int` | Only the three valid renditions can exist |

Every one of those replaces a primitive that could hold a wrong value with a
type that **cannot be constructed wrong**. Most "validation bugs" are a missing
value object.

### Aggregate — a consistency boundary with one door

A cluster of objects treated as **one unit**, with a single **root** that is
the only thing the outside world may hold a reference to. All changes go
through the root, so the root can enforce its invariants.

Earshot's clearest aggregate is `Room`:

```
Room  ← the aggregate root
├── Member[]        (presence, roles)
├── QueueItem[]     (ordered by fractional index)
└── PlaybackState   (track, position, startedAt, version)
```

You never reach in and mutate a `QueueItem`. You call `room.Enqueue(...)` or
`room.Skip(...)`, and the root guarantees that:

- `version` only ever increases, by exactly one per change
- a non-host cannot skip while the mode is `host_only`
- queue positions stay strictly ordered
- `startedAt` is always set when state is `playing`

**One aggregate = one transaction.** This is the rule with real consequences.
It is *why* the outbox in [ADR-0007](adr/0007-transactional-outbox.md) works:
the room change and the event it produced go into the same transaction, because
they are one aggregate's change.

### Repository — hands you aggregates, not rows

```go
rooms.FindByID(id) → *Room          // yes: a whole, valid aggregate
rooms.GetQueueItemRow(id) → Row     // no: that's a DAO, not a repository
```

**One repository per aggregate, never one per table.** A `Room` repository
loads the room *and* its members *and* its queue, because a half-loaded
aggregate can't enforce its own invariants.

### Domain service — logic belonging to no single entity

When behaviour is genuinely domain logic but doesn't sit on one object:
`ClockOffsetEstimator`, `ShuffleStrategy`, `DriftController`. Still pure, still
no infrastructure.

Beware: a "service" that just calls a repository and returns the result isn't a
domain service, it's an anaemic wrapper. Delete it.

### Domain event — something that happened, in the past tense

Named in the business's words, not the database's: `TrackPublished`,
`RoomCreated`, `HostSkippedTrack`, `MemberReconnected`. Not
`RoomTableUpdated`.

We already have these — they are the rows in the outbox table.

### Bounded context — a boundary where words mean one thing

The idea people skip, and the most valuable one at the architecture level.

**"Track" means different things in different services, deliberately:**

| In… | A "Track" is… |
|---|---|
| `catalog-svc` | Title, artist, album, genre, licence, attribution |
| `playback-svc` | An ID, a duration, and a set of HLS renditions |
| `analytics-svc` | An ID and a dimension to group play events by |

Each service has its own `Track` type with only the fields it needs. **They are
not shared.** A single shared `Track` struct used by all three would accumulate
every field every service ever needed, and changing it would mean redeploying
all of them.

So: **our bounded contexts are our services.** That is what
[ADR-0005](adr/0005-service-decomposition.md)'s "one service owns each table"
rule is really enforcing.

### Ubiquitous language — the code uses the product's words

If the product says "room", the code says `Room` — not `Session`, `Channel`, or
`Lobby`. If it says "in sync", the metric is `room_sync_drift_ms`, not
`ws_latency_delta`. Sounds trivial; saves you from translating in your head
every time you read the code six weeks later.

---

## Part 4 — Worked example: the skip command

### The version that looks fine and isn't

```go
func (h *Handler) HandleSkip(conn *websocket.Conn, raw []byte) error {
    var cmd struct{ RoomID, UserID string }
    json.Unmarshal(raw, &cmd)

    row := h.db.QueryRow(
        `SELECT host_user_id, permission_mode, version FROM rooms WHERE id = $1`,
        cmd.RoomID)
    var host, mode string
    var version int64
    row.Scan(&host, &mode, &version)

    if mode == "host_only" && host != cmd.UserID {
        return conn.WriteJSON(map[string]string{"error": "not allowed"})
    }

    h.db.Exec(`UPDATE rooms SET version = version + 1 WHERE id = $1`, cmd.RoomID)
    h.redis.Publish(ctx, "room:"+cmd.RoomID, /* ... */)
    return nil
}
```

Four problems, and only the first is obvious:

1. You cannot test the rule without a database **and** a WebSocket.
2. The rule `host_only` lives in transport. Add a REST admin endpoint and you
   either duplicate it or forget it. The second is more likely.
3. The `UPDATE` and the `Publish` are not atomic — crash between them and the
   room is skipped on the server but nobody is told.
4. `version + 1` in SQL is not a compare-and-set. Two simultaneous skips both
   succeed and you have lost one.

### The layered version

```go
// ── internal/domain/room.go — no imports beyond stdlib ──────────────
func (r *Room) Skip(by UserID, now time.Time) ([]Event, error) {
    if r.Mode == HostOnly && r.HostID != by {
        return nil, ErrNotPermitted          // the rule, in one place
    }
    next, ok := r.Queue.Next()
    if !ok {
        return nil, ErrQueueEmpty
    }
    r.Playback = PlaybackState{
        TrackID: next.TrackID,
        State:   Playing,
        Position: 0,
        StartedAt: now.Add(prepareLead),     // coordinated start
    }
    r.Queue = r.Queue.Drop(next.ID)
    r.Version++                              // invariant: +1, always
    return []Event{HostSkippedTrack{RoomID: r.ID, To: next.TrackID, Version: r.Version}}, nil
}
```

```go
// ── internal/app/skip_track.go — workflow, not rules ────────────────
func (uc *SkipTrack) Execute(ctx context.Context, cmd SkipCmd) error {
    room, err := uc.rooms.FindByID(ctx, cmd.RoomID)
    if err != nil { return err }

    events, err := room.Skip(cmd.By, uc.clock.Now())
    if err != nil { return err }

    // Save does the CAS on room.Version and writes events to the outbox
    // in ONE transaction. Atomicity is the repository's job, not the rule's.
    return uc.rooms.Save(ctx, room, events)
}
```

```go
// ── internal/adapters/ws/skip.go — the "controller" ────────────────
func (h *Handler) handleSkip(c *Client, raw []byte) {
    var in skipFrame
    if err := json.Unmarshal(raw, &in); err != nil {
        c.sendError("bad_frame"); return
    }
    err := h.skipTrack.Execute(c.ctx, app.SkipCmd{RoomID: c.RoomID, By: c.UserID})
    switch {
    case errors.Is(err, domain.ErrNotPermitted): c.sendError("not_permitted")
    case errors.Is(err, domain.ErrQueueEmpty):   c.sendError("queue_empty")
    case err != nil:                             c.sendError("internal")
    }
}
```

Now `room.Skip()` is tested with a struct literal and no Docker. The CAS lives
in one place. Adding a REST admin skip means a second 10-line controller calling
the same use case — the rule cannot drift.

---

## Part 5 — Where we use DDD, and where we refuse to

**This is the important section.** Applying full DDD everywhere is how a
simple CRUD service becomes seven files of ceremony that do one `INSERT`.

| Service | How much DDD | Why |
|---|---|---|
| `social-svc` | **Full tactical DDD** — aggregate, value objects, domain events, invariants on the root | Real invariants that must hold under concurrency: monotonic version, permission modes, queue ordering, coordinated start. This is where the modelling earns its cost. |
| `playback-svc` | **Moderate** — value objects (`Duration`, `QueuePosition`, `Bitrate`), entities, repositories. No elaborate aggregates. | Some genuine rules, but much of it is state in Redis. |
| `catalog-svc` | **Light** — entities and repositories, that's all | It is mostly CRUD plus a search projection. Inventing an `Artist` aggregate would add indirection and buy nothing. |
| `identity-svc` | **Light** — idiomatic NestJS: controller → service → repository | Auth is a well-solved problem with good library conventions. Follow them. |
| `media-worker` | **None** — it's a pipeline | Stages and functions. There is no "domain model of transcoding". Forcing one would be cargo cult. |
| `bff` | **No domain at all, by design** | ADR-0005: the BFF owns no business logic. If a rule appears here, it's in the wrong service. |

**The layering (Part 2) applies everywhere. The DDD modelling (Part 3) applies
where the table above says so.** Those are separate decisions, and conflating
them is the single most common mistake with this material.

### Smells that mean you have over-applied it

- A `Repository`, `Service`, `Entity`, `DTO` and `Mapper` for something that
  does one `INSERT`
- An "aggregate" with one field and no invariants
- `getX()`/`setX()` on every field of a domain object — that's a struct wearing
  a costume (the real name for this is an **anaemic domain model**: all data,
  no behaviour, so the rules end up back in the services anyway)
- A mapper layer that copies 12 fields from one identical struct to another
- You can't explain what invariant an aggregate protects

---

## Part 6 — Where to read

Ordered by what will help *you* most, not by prestige.

**Start here**
1. **Herberto Graça — "DDD, Hexagonal, Onion, Clean, CQRS… How I put it all
   together"** (`herbertograca.com`). One blog post that untangles exactly the
   naming confusion in your question — why "controller", "adapter", "port",
   "boundary" and "interface layer" are often the same thing. Free, one
   evening. **Read this first.**
2. ***Domain-Driven Design Distilled*, Vaughn Vernon.** ~150 pages, the correct
   entry point. Covers bounded contexts, aggregates, domain events without the
   900-page commitment.

**Then, when you're writing the code**
3. ***Architecture Patterns with Python*, Percival & Gregory** — free at
   `cosmicpython.com`. The clearest code-level walkthrough of repository, unit
   of work, aggregates and domain events in print. It's Python, but you're
   reading it for the *shapes*, and the shapes transfer to Go and TypeScript
   unchanged.
4. **Ben Johnson — "Standard Package Layout"** and
   **ThreeDotsLabs/wild-workouts-go-ddd-example** on GitHub. Go-specific. The
   repo is a full working DDD service with the layering visible in the folders —
   the closest thing to a reference implementation for what `social-svc` should
   look like.

**Later, or never**
5. ***Clean Architecture*, Robert Martin.** The dependency rule explained
   clearly. Repetitive — skim the middle third.
6. **Eric Evans, *Domain-Driven Design* (the "Blue Book").** The original, and
   genuinely great, but dense and 2003-vintage in its examples. Read it third,
   after you've felt the problems it solves. Reading it first is the most
   common way people bounce off DDD.

**Do not start with** the Blue Book, or with any tutorial titled "Clean
Architecture in <framework>" — those teach the folder structure without the
reasoning, which is how you end up with ceremony and no benefit.

---

## What to take away

1. **Layering is mechanical and always worth it.** Rules in the domain,
   workflow in the application layer, protocol in the controller,
   implementations in infrastructure. Dependencies point inward.
2. **The controller is boring on purpose.** Parse, call one thing, map the
   error. 15 lines.
3. **Value objects are the cheapest win in this whole document.** Start there.
4. **An aggregate is a transaction boundary.** If you can't name the invariant
   it protects, it isn't one.
5. **Bounded contexts are our services** — that's why `Track` means three
   different things and that's correct.
6. **Use full DDD only in `social-svc`.** Everywhere else, less. Knowing where
   *not* to apply a pattern is the actual skill.
