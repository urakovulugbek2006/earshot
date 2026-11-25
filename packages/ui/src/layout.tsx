/**
 * The chrome that is on every screen: the top navigation and the room strip.
 *
 * Both exist because of ADR-0011. There is no left sidebar, and the persistent
 * bar is docked to the TOP and belongs to the room rather than to the track —
 * what persists across screens is "you are in sync with four people at 42ms",
 * not "a track is playing".
 */
import type { ReactNode } from 'react';
import { Button, Label, Num, StatusChip, Meter } from './primitives';

/* ── Mark ─────────────────────────────────────────────────────────────── */

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" role="img" aria-label="Earshot">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="23" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="22.5" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/* ── TopNav ───────────────────────────────────────────────────────────── */

export type NavItem = { href: string; label: string; current?: boolean };

export function TopNav({ items, children }: { items: NavItem[]; children?: ReactNode }) {
  return (
    <header className="flex min-h-[54px] flex-wrap items-center gap-5 border-b border-hair bg-surface px-5">
      <a href="/" className="flex shrink-0 items-center gap-2.5 text-accent">
        <Mark />
        <span className="font-mono text-[13px] font-bold uppercase tracking-[0.1em] text-primary">
          Earshot
        </span>
      </a>

      <nav aria-label="Main" className="flex shrink-0 self-stretch">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.current ? 'page' : undefined}
            className={
              'flex items-center px-3.5 font-mono text-[11.5px] uppercase tracking-[0.09em] ' +
              (item.current
                ? 'font-medium text-primary shadow-[inset_0_-2px_0_var(--accent)]'
                : 'text-muted')
            }
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2.5">
        {children}
      </div>
    </header>
  );
}

/* ── RoomStrip ────────────────────────────────────────────────────────────
   Top-docked, and it describes the ROOM. The accent rule down its left edge
   is the only place an accent is used as a 1px line — cyan could not have
   done that at 5.5:1, violet can at 7.2:1. */

export type Member = { initials: string; name: string; driftMs: number | null };

export function RoomStrip({
  room,
  track,
  artist,
  elapsed,
  remaining,
  progress,
  members,
  maxDriftMs,
  bufferSeconds,
  bitrateKbps,
}: {
  room: string;
  track: string;
  artist: string;
  elapsed: string;
  remaining: string;
  progress: number;
  members: Member[];
  maxDriftMs: number;
  bufferSeconds: number;
  bitrateKbps: number;
}) {
  const drifting = maxDriftMs >= 250;
  return (
    <div className="flex flex-wrap items-stretch border-b border-hair bg-raised">
      <div className="w-[3px] shrink-0 bg-accent" aria-hidden="true" />

      <div className="flex min-w-0 flex-[1_1_250px] flex-col justify-center border-r border-hair px-4 py-2.5">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          <Label>In room · {room}</Label>
        </div>
        <div className="truncate text-[13.5px] font-semibold text-primary">
          {track} <span className="font-normal text-muted">— {artist}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 border-r border-hair px-3.5 py-2">
        <Button size="sm" aria-label="Previous track">
          ◀◀
        </Button>
        <Button size="sm" variant="accent" aria-label="Pause">
          ❙❙
        </Button>
        <Button size="sm" aria-label="Next track">
          ▶▶
        </Button>
      </div>

      <div className="flex min-w-0 flex-[1_1_200px] items-center gap-3 border-r border-hair px-4 py-2.5">
        <Num tone="accent" className="text-[11.5px]">
          {elapsed}
        </Num>
        <div className="min-w-0 flex-1">
          <Meter value={progress} label="Playback position" />
        </div>
        <Num tone="muted" className="text-[11.5px]">
          {remaining}
        </Num>
      </div>

      <div className="flex shrink-0 items-center gap-4 px-4 py-2.5">
        <ul className="flex gap-1">
          {members.slice(0, 3).map((m) => (
            <li
              key={m.initials}
              title={`${m.name} · ${m.driftMs === null ? 'resyncing' : `${m.driftMs}ms`}`}
              className="flex size-[22px] items-center justify-center rounded-sm border border-strong bg-surface font-mono text-[8.5px] text-secondary"
            >
              {m.initials}
            </li>
          ))}
          {members.length > 3 ? (
            <li className="flex size-[22px] items-center justify-center rounded-sm border border-dashed border-strong font-mono text-[8.5px] text-muted">
              +{members.length - 3}
            </li>
          ) : null}
        </ul>

        {/* The telemetry that makes the thesis visible rather than promised. */}
        <dl className="flex gap-3.5 font-mono text-[10px] tracking-[0.06em]">
          <div className="flex gap-1">
            <dt className="text-muted">SYNC</dt>
            <dd>
              <Num tone={drifting ? 'warn' : 'live'} unit="ms">
                {maxDriftMs}
              </Num>
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-muted">BUF</dt>
            <dd>
              <Num tone="muted" unit="s">
                {bufferSeconds}
              </Num>
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-muted">AAC</dt>
            <dd>
              <Num tone="muted">{bitrateKbps}</Num>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* ── RoomRow — one live room on the On air screen ─────────────────────── */

export function RoomRow({
  name,
  mode,
  host,
  track,
  artist,
  listeners,
  driftMs,
  cta,
  accentEdge = 'accent',
}: {
  name: string;
  mode: string;
  host: string;
  track: string;
  artist: string;
  listeners: number;
  driftMs: number;
  cta: string;
  accentEdge?: 'accent' | 'live' | 'warn' | 'info';
}) {
  const edges = {
    accent: 'bg-accent',
    live: 'bg-live',
    warn: 'bg-warn',
    info: 'bg-info',
  } as const;
  const drifting = driftMs >= 250;
  return (
    <article className="flex flex-wrap items-stretch border-b border-hair last:border-b-0">
      <div className={`w-[3px] shrink-0 ${edges[accentEdge]}`} aria-hidden="true" />

      <div className="min-w-0 flex-[1_1_230px] px-4 py-3.5">
        <div className="mb-1.5 flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${edges[accentEdge]}`} aria-hidden="true" />
          <Label>{mode}</Label>
        </div>
        <h3 className="text-[19px] font-semibold tracking-[-0.015em] text-primary">{name}</h3>
        <p className="text-[12.5px] text-muted">{host}</p>
      </div>

      <div className="flex min-w-0 flex-[1_1_210px] flex-col justify-center border-l border-hair px-4 py-3.5">
        <Label>Playing</Label>
        <span className="mt-0.5 truncate text-[13.5px] font-semibold text-primary">{track}</span>
        <span className="truncate text-[12px] text-muted">{artist}</span>
      </div>

      <div className="flex shrink-0 items-center gap-5 border-l border-hair px-4 py-3.5">
        <div className="flex flex-col items-end">
          <Label>Drift</Label>
          <Num tone={drifting ? 'warn' : 'live'} unit="ms" className="text-[13px] font-bold">
            {driftMs}
          </Num>
        </div>
        <div className="flex flex-col items-end">
          <Label>In</Label>
          <Num className="text-[13px] font-bold">{String(listeners).padStart(2, '0')}</Num>
        </div>
        <Button variant={cta === 'Open' ? 'ghost' : 'accent'}>{cta}</Button>
      </div>
    </article>
  );
}
