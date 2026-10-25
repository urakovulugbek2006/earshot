# Design Patterns, Algorithms & Data Structures

## The rule

**A pattern earns its place by removing a pain you have already felt.**

The failure mode here is predictable: you decide to "use design patterns", so you
wrap everything in a factory, add an `AbstractPlaybackStrategyProvider`, and the
codebase becomes harder to read than the problem it solves. That is worse than no
patterns at all, and a reviewer spots it instantly.

So this document only lists patterns and algorithms this system **actually
demands**. Each entry names what you would feel without it. If an entry ever
stops hurting, delete the pattern.

Second rule: **implement the naive version yourself before reaching for the
library.** For every algorithm marked ★ below, you write it, benchmark it, and
then decide whether to keep yours or swap in the real one — and record why in a
one-paragraph note. That decision *is* the learning. Skipping to the library
teaches you the API, not the idea.

---

## Part 1 — Design patterns

### Week 2 — Platform foundations

| Pattern | Where | Without it |
|---|---|---|
| **Repository** | `catalog-svc`, `identity-svc` data access, one per aggregate | SQL smeared through handlers; you cannot test business logic without a database |
| **Dependency injection** | NestJS natively; Go via constructor + interface | Every test needs real Postgres, Redis and Kafka |
| **Chain of Responsibility** | HTTP middleware: trace → auth → rate limit → handler | Cross-cutting concerns copy-pasted into 40 handlers |
| **Adapter** | Jamendo client, S3 client, email provider behind *your* interfaces | Swapping MinIO for S3, or Resend for Postmark, touches business code |

### Week 3 — Ingest pipeline

| Pattern | Where | Without it |
|---|---|---|
| **Pipeline** | probe → transcode → waveform → artwork → publish, as composable stages | One 400-line `processTrack()` you cannot test a slice of or resume mid-way |
| **Strategy** | per-rendition transcode profiles; per-source-format decoding | `if format == "flac" … else if format == "mp3" …` growing forever |
| **★ Transactional Outbox** | writing to Postgres *and* publishing to Kafka atomically | Dual-write: the row commits, the event is lost, and your search index silently drifts from the truth. **This is the single most important pattern in the project** — ADR-0005 forbids dual-writes, and this is how you honour that |
| **Idempotent Receiver** | every Kafka consumer, keyed on event id | A redelivered `track.uploaded` transcodes the same file twice and double-charges your CPU budget |
| **Retry with exponential backoff + jitter** | all worker jobs and outbound HTTP | A Jamendo rate-limit response kills your whole import run |
| **Circuit Breaker** | Jamendo client, email provider | A hung third party ties up every worker goroutine until the pool is exhausted |
| **Dead Letter Queue** | after N failed attempts | One malformed MP3 blocks the queue head forever |

### Week 4 — Playback

| Pattern | Where | Without it |
|---|---|---|
| **★ State machine** | the player: `idle → loading → buffering → playing → paused → seeking → ended → error` | The classic broken web player: you hit next during a seek while buffering, and it plays two tracks at once. **Naive players fail exactly here** |
| **Command** | transport actions as objects (`PlayCmd`, `SeekCmd`, `EnqueueCmd`) | No single place to log, queue, rate-limit, replay or test user intent — and in week 6 you need to send these over the wire, which a method call cannot be |
| **Observer** | player emits events; UI, analytics and room sync subscribe | The player imports your React store and your Kafka producer, and becomes untestable |
| **Facade** | one `PlayerController` hiding the audio element, hls.js and the state machine | React components reach into `hls.js` internals and every refactor breaks the UI |

### Week 5 — Library, search, discovery

| Pattern | Where | Without it |
|---|---|---|
| **CQRS (light)** | writes to Postgres, reads from Meilisearch / ClickHouse | You try to serve typo-tolerant search and hourly analytics from the same normalised tables, and both are slow |
| **Decorator** | a caching layer wrapping a repository, same interface | Cache logic tangled into every query site, invalidated inconsistently |
| **Specification** | composable search filters (genre AND bpm-range AND licence) | A `searchTracks()` with 11 optional parameters |
| **Projection / Materialised View** | Kafka consumer builds the search and analytics read models | Covered by Outbox above; this is its consumer half |

### Week 6 — Listening rooms

| Pattern | Where | Without it |
|---|---|---|
| **★ Mediator** | the room hub: members never talk to each other, only to the hub | N² client-to-client messaging, no authority, no way to resolve conflicts. This is *why* ADR-0001 chose a server-authoritative clock |
| **Memento / Snapshot** | full room state for a late joiner or a reconnect after a long gap | A reconnecting client has to replay the entire room history, or just guesses |
| **★ Optimistic concurrency (CAS on `version`)** | every room mutation, via a Redis Lua script | Two simultaneous skips both succeed, the room ends up in two different states on two pods, and nobody can tell which is right |
| **Leader election** | one pod runs the presence reaper (Redis lock) | Every pod broadcasts the same "user left" event, N times |
| **Publish–Subscribe** | Redis pub/sub fanout across `social-svc` replicas | Rooms break the moment you run two pods |

### Weeks 7–8 — Hardening and operations

| Pattern | Where | Without it |
|---|---|---|
| **Bulkhead** | ffmpeg workers capped at `NumCPU − 2`, separate connection pools per service | A big import run starves the serving path and the whole site goes slow (see `03-capacity-and-cost.md`) |
| **Sidecar** | OTel collector alongside each service | Every service hardcodes its telemetry backend |
| **Health check / readiness gate** | k3s probes controlling rolling updates | A deploy routes traffic to a pod whose database migration hasn't finished |
| **Saga** | *only if* the Stripe stretch happens: subscribe → charge → provision → entitle | A failed charge leaves a user provisioned but unpaid, with no compensating path |

### Patterns we are deliberately NOT using

Say no to these, in writing, so you are not tempted:

- **Singleton** — a disguised global; in Go it fights testability, in Nest the container already owns lifetimes
- **Abstract Factory / Builder** — our object graphs are flat; constructors are enough
- **Visitor** — no deep polymorphic trees here
- **Service Locator** — DI with explicit constructors beats it every time
- **Generic `BaseService<T>` inheritance** — composition and interfaces instead
- **Event Sourcing as the write model** — we use an event *log* for projections, but Postgres stays the source of truth. Full event sourcing is a 3-week detour, and ADR-0005 does not need it

---

## Part 2 — Algorithms & data structures

This is where the project genuinely beats grinding exercises: every problem below
is one you actually have to solve, so the solution sticks.

### The three signature problems — go deep on these

These are distinctive, demonstrable, and worth a blog post each.

#### ★ 1. Fractional indexing for the shared queue (weeks 4 & 6)
Several people reorder the same queue concurrently. Integer positions force you
to renumber every row on each insert, which is O(n) writes and races badly.

**Solution:** order keys as *strings*, so inserting between `"a0"` and `"a1"`
yields `"a0V"` — one write, no renumbering, and concurrent inserts at the same
position produce different keys that both survive. This is what Figma, Linear
and Jira actually do (LexoRank / fractional indexing).

Implement: key generation between two bounds, rebalancing when keys grow long,
and the tie-break when two clients generate the same key. Then prove it with a
concurrency test.

#### ★ 2. Clock offset estimation and drift control (week 6)
Already specified in `04-listening-rooms-design.md`. The algorithmic content:

- **Ring buffer** of the last 8 offset samples
- **Minimum-RTT selection** — offset error is bounded by `rtt/2`, caused by
  *asymmetric* latency, so the lowest-RTT sample is the most trustworthy. Taking
  a mean here is the intuitive choice and it is wrong; understanding why is the
  lesson
- **Outlier rejection** — discard samples with RTT > 2× current best
- **Hysteresis control loop** — dead zone, proportional correction via
  `playbackRate`, hard-seek escape hatch, rate limiting on corrections

#### ★ 3. Shuffle that feels random (week 4)
**Fisher-Yates** is 6 lines and gives you a uniformly random permutation. Then
users complain it "isn't random" because three tracks by the same artist landed
together — which a uniform shuffle will do, and humans read as a bug.

The real problem is **spread**: distribute items so same-artist tracks are
maximally separated. Implement Fisher-Yates first, confirm the clustering
complaint is real with a histogram, then implement artist-aware spreading
(Spotify published their approach). This is a perfect lesson in *the correct
algorithm being the wrong answer*.

### Everything else, by week

| Week | Problem | Technique | Data structure |
|---|---|---|---|
| 2 | ★ Rate limiting | **Token bucket** vs sliding-window log vs sliding-window counter — implement all three in Redis Lua and compare memory/accuracy | Redis hash, sorted set |
| 2 | Password hashing cost tuning | argon2id parameter selection against a latency budget | — |
| 3 | ★ Waveform peaks from PCM | min/max **decimation** over windows; then **LTTB** (Largest-Triangle-Three-Buckets) for visually honest downsampling | Fixed-size float array |
| 3 | Resumable upload | chunk accounting, checksum verification | Bitmap of received chunks |
| 3 | Backoff scheduling | **decorrelated jitter** — compare against full jitter and fixed interval | Priority queue |
| 4 | ★ Seek → HLS segment | **binary search** over cumulative segment durations | Sorted interval array |
| 4 | ★ Client segment cache | **LRU** — hash map + doubly linked list, O(1) get and put. The canonical interview question, with a real purpose for once | Hash map + DLL |
| 4 | Gapless-ish transition | lookahead prefetch scheduling | Ring buffer |
| 5 | ★ Typo-tolerant search | **Damerau-Levenshtein** distance, bounded; **n-gram / trigram** indexing; **BM25** ranking. Write a toy version over 2,000 tracks, then compare quality *and* latency against Meilisearch | Inverted index, DP matrix |
| 5 | Autocomplete | **trie** with top-K at each node | Trie / radix tree |
| 5 | Charts & trending | **top-K via min-heap** of size K; **Count-Min Sketch** for approximate counts at scale | Min-heap, CMS |
| 5 | Unique listeners | **HyperLogLog** — understand the error bound before you quote the number | HLL (Redis / ClickHouse native) |
| 5 | "Already heard this?" | **Bloom filter** — cheap negative lookups, and you must handle false positives correctly | Bit array + k hashes |
| 5 | Tag-based recommendations | **cosine similarity** / **Jaccard index** over tag sets | Sparse vector |
| 6 | DJ rotation fairness | circular queue with skip-on-absent; **deficit round robin** if you want weighting | Circular buffer |
| 6 | Presence with TTL | sorted set keyed by last-seen; range eviction | Redis ZSET |
| 6 | Room → pod routing | **consistent hashing** with virtual nodes. ADR-0005 records this as the rejected alternative — implement it anyway, as an exercise, to understand what you turned down | Hash ring |
| 7 | Load test modelling | **Little's Law** for concurrency, percentile estimation (why p99 of a sum ≠ sum of p99s) | t-digest |
| 7 | Query optimisation | index selection, cardinality estimation, reading `EXPLAIN ANALYZE` | B-tree, GIN |
| Stretch | Collaborative filtering | **item-item CF** with cosine similarity on a sparse co-occurrence matrix; **implicit ALS** | **CSR sparse matrix** |
| Stretch | Approximate nearest neighbour | **MinHash + LSH** | Signature matrix, hash bands |
| Stretch | Artist similarity graph | **BFS** for degrees of separation, **Dijkstra** for weighted paths, **PageRank** for influence | Adjacency list |
| Stretch | Offline collaborative playlists | **CRDT** — LWW-element-set, or RGA for ordering. Note: fractional indexing above is already half of this | — |

---

## Part 3 — The deliberate-practice ritual

For each ★ item, in order:

1. **Write the explainer first.** One page: what the problem is, why the obvious
   approach fails, what the technique does. Before any code.
2. **Implement the naive version yourself.** No library. It is allowed to be slow.
3. **Write a test that proves it correct**, including the edge case that makes it
   interesting (concurrent insert, redelivered event, asymmetric latency).
4. **Benchmark it.** Go's `testing.B`, or `vitest bench`. Record real numbers.
5. **Decide:** keep yours, or swap in the library. Write one paragraph in
   `docs/notes/` on why. Both answers are legitimate; the undocumented choice is
   not.
6. **Explain it back in three sentences.** If you can't, go back to step 1.

Expected volume: 14 ★ items × ~60 lines each ≈ 850 lines of your own code. That
is slightly above the 600-line target in `00-project-plan.md` — adjust that
target to **~900 lines**, because this is exactly the kind of code worth writing
by hand.

---

## Part 4 — How this changes the plan

- Weeks stay as they are. Patterns and algorithms are **not** new weeks — they
  are how the existing weeks get built.
- Add to the **definition of done**: a PR that introduces a ★ item links its
  explainer note and its benchmark numbers.
- Add one artefact: `docs/notes/` holds the one-paragraph decision notes. By
  week 8 that folder is a genuine portfolio piece — it shows judgement, not just
  output.
- The `00-project-plan.md` personal-code target moves from 600 to ~900 lines.

## Reading

- *Designing Data-Intensive Applications*, Kleppmann — chapters 5, 7, 9, 11 map
  almost exactly onto weeks 3, 5 and 6 of this project
- *Release It!*, Nygard — circuit breaker, bulkhead, the week 7 failure modes
- *Patterns of Enterprise Application Architecture*, Fowler — repository, outbox,
  unit of work
- microservices.io pattern catalogue — outbox, saga, CQRS, with trade-offs stated
- Figma's "Realtime editing of ordered sequences" — fractional indexing, from the
  people who shipped it
- The NTP RFC 5905 clock-filter algorithm — where the minimum-RTT trick comes from
