# How to Draw System Design

A method, not a style guide. Work through it once and you will be able to draw
any system, not just this one.

---

## Why most architecture diagrams are useless

Four failure modes, in order of how often they happen:

1. **Everything on one page.** Users, services, database tables and the login
   button all in one picture. It tells you nothing because it tries to tell you
   everything.
2. **Unlabelled arrows.** A line from `bff` to `catalog-svc` with no label. Does
   it read? Write? Both? Over what? Who starts the conversation? The line is
   decoration.
3. **Mixed altitude.** A box for "PostgreSQL" sitting next to a box for "the
   search bar". These are not comparable things, so the diagram has no meaning.
4. **Drawing the tech stack instead of the system.** A box labelled "Docker",
   a box labelled "TypeScript". Those are *how* it is built, not *what* it is.

All four come from the same mistake: starting to draw before deciding **who the
diagram is for**.

---

## The one rule

> **Pick an audience and an altitude. Then never mix altitudes on one page.**

C4 is just four named altitudes. That's the whole model — not a notation, a
discipline for not mixing levels.

| Level | Shows | Audience | Boxes | Draw it? |
|---|---|---|---|---|
| **L1 Context** | Your system as *one box*, plus the people and outside systems it talks to | Anyone, including non-technical | 5–10 | Always. Once. |
| **L2 Container** | Inside the box: the separately deployable/runnable things and the data stores | Developers | 10–20 | Always. This is the one you'll use daily. |
| **L3 Component** | Inside *one* container: its major internal parts | Whoever works on that container | 5–15 | Only for the 1–2 genuinely hard ones. For us: `social-svc` and the player. |
| **L4 Code** | Classes, functions | — | — | **Never.** Your IDE generates this better and it is stale the day you draw it. |

If you want to show more detail, you do not add it to the page. You draw the
*next* page.

---

## The five drawing rules

**1. Every box is a thing that exists.**
Give it three things: a **name**, a **type**, and a **one-line purpose**.

```
┌─────────────────────────┐
│  catalog-svc            │  ← name
│  [Go service]           │  ← type
│  Owns tracks, artists,  │  ← purpose, one line
│  albums; search source  │
└─────────────────────────┘
```

If you can't write the one-line purpose, the box is wrong. Either it does two
things (split it) or you don't know what it does yet (that's the real finding).

**2. Every arrow is labelled with what flows and over what.**

| Bad | Good |
|---|---|
| `uses` | `reads track metadata · gRPC` |
| `data` | `publishes track.published · Kafka` |
| `connects to` | `reads/writes sessions · Redis RESP` |
| *(no label)* | `fetches HLS segments · HTTPS, signed URL` |

The label test: a reader should be able to guess the function signature.

**3. Arrow direction is who *initiates*, not where data ends up.**

The most-missed rule. `catalog-svc → Meilisearch` is correct even though you are
*reading* search results back, because `catalog-svc` makes the call. If the
arrow pointed at `catalog-svc` it would mean Meilisearch calls it, which it
never does.

Consequence: **a double-headed arrow is almost always a mistake.** It means one
of three things, and you must say which:
- Two separate interactions → draw two labelled arrows
- A long-lived connection → label it (`WebSocket, bidirectional frames`)
- You haven't worked out who is in charge → **stop drawing and decide.** This is
  exactly how ADR-0001 landed on a server-authoritative clock: the honest arrow
  could not be drawn until someone owned the room state.

**4. One page, one altitude.** Already said, said again because it is the rule
you will break.

**5. Always a legend.** If shape or colour means something, state it on the page.
If it doesn't mean anything, don't vary it. Three colours maximum.

---

## The method — six steps, in this order

Don't improvise the order. The order is what makes it work.

### Step 1 — List the people
Not systems. **Humans**, with the goal that brings them here.

> Listener — wants to discover music and listen with friends
> Artist — wants to publish tracks and see who listens
> Admin — reviews uploads, handles abuse

If two "people" have the same goal, they are one actor. If one person has two
unrelated goals, they are two actors.

### Step 2 — List the outside systems you don't own
Jamendo, Google OAuth, the email provider, Cloudflare. Anything you cannot
deploy or fix.

### Step 3 — Draw one box in the middle and name it
That's your whole system. One box. Resist adding anything to it.

### Step 4 — Draw arrows: actors inward, your box outward to externals. Label every one.
**You have now finished L1.** It should take 15 minutes and fit on a postcard.

### Step 5 — For L2, list what you would deploy separately
One box each. Then apply the hard test:

> **If I can't say why these two boxes aren't one box, they are one box.**

This test is what keeps you from drawing twelve microservices. It's also exactly
the reasoning recorded in ADR-0005.

### Step 6 — Add the data stores, then the arrows, then find the arrow you can't label
That last part is the point of the whole exercise. **The arrow you cannot label
honestly is your design flaw.** Every time. Examples you will actually hit:

- An arrow from `catalog-svc` to another service's tables → violates ADR-0005's
  schema ownership. The arrow can't be labelled because it shouldn't exist.
- An arrow you want to label "writes to Postgres *and* publishes to Kafka" →
  that's two operations pretending to be one, and it's the dual-write bug.
  ADR-0007 exists because this arrow couldn't be drawn.

Finding those two is worth more than the diagram.

---

## Is my diagram any good? Five checks

1. Can someone who has never seen it tell you **what happens when a user presses
   play**? If not, your labels are too vague.
2. Can you find the **single point of failure** in ten seconds?
3. Does **every** arrow answer "who calls whom"? Any arrow that doesn't is a
   decision you haven't made.
4. **Count the boxes.** More than 20 at one altitude means you're at the wrong
   altitude.
5. Could you **delete one box and explain what breaks**? If a box has no
   consequence, it isn't real.

---

## The other half: sequence diagrams

C4 shows **structure** — what exists. Sequence diagrams show **time** — what
happens in what order. You need both, and structure alone will hide your worst
bugs.

Rule: **draw a sequence diagram for every flow that crosses three or more
services.** Anything you cannot draw as a sequence, you have not designed yet.

Each lifeline is one box from your L2. Each arrow is one call, in time order,
top to bottom. Mark where a transaction begins and commits. Mark where you wait.

**The thing nobody does and everybody should:** after drawing the happy path,
draw the same diagram with one step failing. The ADR-0007 test — "kill the
process between commit and publish" — came straight out of that exercise.

---

## Your exercises

In order. Check each against the named doc only *after* you've drawn it — the
gap between your version and that one is the actual lesson.

| # | Exercise | Time | Check against | What you should discover |
|---|---|---|---|---|
| 1 | L1 Context, from Steps 1–4 above | 20 min | `02-architecture-c4.md` | The admin plane is reachable only over WireGuard — an arrow with a constraint on it |
| 2 | L2 Containers | 40 min | `02-architecture-c4.md` | That you want an arrow from a client straight to `social-svc`, bypassing the BFF — and why that's correct here |
| 3 | Sequence: *user presses play* | 30 min | §"Key sequence diagrams" | Whether you remembered the signed-URL step. Most people draw the client fetching audio directly from the service, which would push every byte through the application tier |
| 4 | Sequence: *host skips a track, 4 members across 2 pods* | 45 min | `04-listening-rooms-design.md` | Whether you understood the Redis CAS and the pub/sub fanout. This one is genuinely hard |
| 5 | Failure drawing: *the outbox relay dies* | 20 min | `adr/0007` | That the system keeps accepting writes and **looks healthy** while every projection goes stale. Then: what metric would tell you? |

Exercise 5 is the most valuable one in the list. Do not skip it.

---

## Tools

| Tool | Use it for |
|---|---|
| **FigJam** | Thinking and reviewing with someone. Fastest to a first draft. |
| **Excalidraw** | Same, hand-drawn feel, free, no account |
| **draw.io** | Precise diagrams you'll maintain for months |
| **Mermaid** | Diagrams that live *in the repo* and version with the code — what `02-architecture-c4.md` uses |
| **Structurizr** | Real C4: define the model once in text, generate all four levels. Overkill for one project, worth knowing it exists |

Keep the source editable. A PNG with no source is a diagram that will be wrong
in three weeks and never fixed.
