# Capacity Planning & Cost Model

Doing this *before* buying hardware is the whole point. Numbers are
back-of-envelope and that's fine — the discipline is what matters.

## Design targets

| Metric | Demo target | Design headroom |
|---|---|---|
| Registered users | 1,000 | 50,000 |
| Daily active users | 200 | 10,000 |
| Peak concurrent listeners | 50 | 1,000 |
| Concurrent listening rooms | 10 | 500 |
| Catalog size | 5,000 tracks | 100,000 tracks |
| Search p99 | < 100 ms | < 150 ms |
| API p99 | < 200 ms | < 300 ms |
| Room sync drift | < 250 ms | < 250 ms |
| Availability SLO | 99.5% | 99.9% |

## Bandwidth

Audio at 128 kbps = **16 KB/s** per listener.

| Scenario | Concurrent | Throughput |
|---|---|---|
| Demo peak | 50 | 0.8 MB/s ≈ **6.4 Mbps** |
| Design peak | 1,000 | 16 MB/s ≈ **128 Mbps** |

Monthly egress at demo scale: 200 DAU × 45 min × 60 s × 16 KB ≈ **8.6 GB/day
≈ 260 GB/month**. At design scale: ~13 TB/month.

**With Cloudflare in front caching HLS segments, origin egress drops ~80–90%** —
segments are immutable and highly shared. This is the single highest-leverage
infrastructure decision in the project, and it's free.

## Storage

Per 4-minute track:

| Artifact | Size |
|---|---|
| Original upload (320 kbps MP3 or FLAC) | 10–40 MB |
| HLS AAC 64 kbps | 2 MB |
| HLS AAC 128 kbps | 4 MB |
| HLS AAC 256 kbps | 8 MB |
| Artwork (4 sizes) + waveform JSON | 0.5 MB |
| **Derived total (hot)** | **~14 MB** |

| Catalog | Hot (HLS) | Cold (masters) |
|---|---|---|
| 5,000 tracks | 70 GB | 150 GB |
| 20,000 tracks | 280 GB | 600 GB |
| 100,000 tracks | 1.4 TB | 3 TB |

**Decision: masters do not live on the server's NVMe.** They go to a cheap
Storage Box (SFTP/S3) immediately after transcode. Only HLS output and artwork
stay hot. This halves the disk requirement and is a real-world pattern.

## Database sizing

- Catalog: 20k tracks + 5k artists + metadata ≈ **under 1 GB**. Trivial.
- Play events: 200 DAU × 25 plays/day = 5,000/day = **1.8 M/year**. Postgres
  could hold it, but the *analytical queries* (listens by hour by region by
  genre) are what kill a row store. Hence ClickHouse.
- ClickHouse with compression: ~40 bytes/event → 1.8M events ≈ **70 MB/year**.
  Essentially free.
- Redis working set: 1,000 sessions + 1,000 queues (~2 KB each) + presence
  ≈ **under 100 MB**.

## CPU — transcoding is the real consumer

ffmpeg AAC encoding runs roughly 25–40× realtime per core.

One 4-minute track × 3 renditions = 720 s of audio ÷ 30× ≈ **24 CPU-seconds**.

- Importing 2,000 Jamendo tracks: 2,000 × 24 s = 13.3 CPU-hours → **~1.7 hours
  on 8 cores**. Run it overnight, once.
- Steady state (10 uploads/day): negligible.

**Implication:** cap `media-worker` concurrency at `NumCPU - 2` so transcoding
can never starve the serving path. Better still, run it with a lower CPU share
in k3s. This is a good lesson in resource isolation.

## Memory budget — this is what sizes the server

| Component | RAM |
|---|---|
| Postgres (shared_buffers 2G + connections) | 4 GB |
| Redis | 1 GB |
| ClickHouse | 4 GB |
| Redpanda (Kafka) | 2 GB |
| Meilisearch | 1 GB |
| MinIO | 1 GB |
| 7 application services | 3.5 GB |
| Grafana + Prometheus + Loki + Tempo | 4 GB |
| k3s control plane + system | 2 GB |
| ffmpeg workers (2 × 500 MB) | 1 GB |
| Headroom (don't skip this) | 8 GB |
| **Total** | **~32 GB** |

**The observability stack costs as much RAM as the database.** That surprises
everyone the first time. It's still worth it.

## Server recommendation

| Option | Spec | Price | Verdict |
|---|---|---|---|
| **Hetzner server auction** | Ryzen 5/7, 64 GB RAM, 2×512 GB NVMe, 1 Gbps unmetered | **€35–50/mo** | **Recommended.** Best value by a wide margin. Double the RAM you need for the same price as half. |
| Hetzner CCX33 (cloud) | 8 vCPU dedicated, 32 GB, 240 GB | ~€65/mo | Pay more for snapshots and 1-click resize. Disk is too small — needs a volume. |
| Hetzner CPX51 (cloud) | 16 vCPU shared, 32 GB, 360 GB | ~€55/mo | Decent fallback. Shared vCPU hurts transcoding. |
| Home mini-PC | Used Ryzen mini, 32 GB, 1 TB | ~€350 once | Cheapest long-run. CGNAT/dynamic IP/ISP ToS issues; needs Cloudflare Tunnel. Residential uptime is poor. |

### Recommended purchase (week 8)

- **Hetzner server auction**, filter: ≥ 64 GB RAM, ≥ 2× NVMe, Ryzen or newer Xeon
- **+ Storage Box BX11** (1 TB, €4/mo) for masters + backups
- **+ domain** (~€12/yr) and **Cloudflare free tier**
- Set up **RAID 1** across the two NVMes (or ZFS mirror — more to learn)

**Total: ~€45–55/month, ~€110 for the whole 2-month project.**

### Cost control

- Hetzner bandwidth is unmetered — this is why we're not on AWS. The same project
  on AWS would cost **$300–600/month**, mostly CloudFront egress and RDS.
- Set a billing alert anyway.
- Write down a killswitch procedure: how to take the public site down in 60
  seconds if something goes wrong (Cloudflare "Under Attack" + scale ingress to 0).

## SLOs to define in week 8

| SLO | Target | Error budget / 30 days |
|---|---|---|
| API availability | 99.5% | 3h 36m |
| Playback start latency (p95 < 1s) | 99% | 7h 12m |
| Room sync drift < 250ms | 95% of samples | — |
| Successful transcode rate | 99.9% | — |

Wire these into Grafana with burn-rate alerts. Then deliberately blow one
through the incident simulation.
