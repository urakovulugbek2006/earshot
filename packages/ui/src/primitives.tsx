/**
 * The pieces every Earshot screen is made of.
 *
 * None of these name a colour. They ask for a role — bg-surface, text-muted,
 * border-hair, bg-accent — which resolves through design/tokens.json. That is
 * why five palette changes cost one file each (ADR-0015).
 */
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

/* ── Num ──────────────────────────────────────────────────────────────────
   Every number in the product: BPM, key, timecode, milliseconds, LUFS,
   counts. Mono with tabular figures, so a value that updates every second
   does not make its row jitter and columns stay aligned. */

export function Num({
  children,
  unit,
  tone = 'default',
  className = '',
}: {
  children: ReactNode;
  unit?: string;
  tone?: 'default' | 'muted' | 'accent' | 'live' | 'warn';
  className?: string;
}) {
  const tones = {
    default: 'text-primary',
    muted: 'text-muted',
    accent: 'text-accent',
    live: 'text-live',
    warn: 'text-warn',
  } as const;
  return (
    <span className={`font-mono tabular-nums ${tones[tone]} ${className}`}>
      {children}
      {unit ? <span className="text-muted font-normal">{unit}</span> : null}
    </span>
  );
}

/* ── Label ────────────────────────────────────────────────────────────────
   The mono micro-label. 9.5px is only legible because it is uppercase with
   very wide tracking — do not reuse the size on sentence-case text. */

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`font-mono text-[9.5px] font-medium uppercase tracking-[0.13em] text-muted ${className}`}
    >
      {children}
    </span>
  );
}

/* ── Button ───────────────────────────────────────────────────────────────
   `accent` is for actions only — play, publish, join, sign in. Gold means
   live and is never a button (design/README.md). The visual control may be
   36px; the 44px hit area comes from theme.css base rules, not from here. */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'accent' | 'ghost' | 'quiet';
  size?: 'sm' | 'md';
};

export function Button({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const variants = {
    accent: 'border-accent bg-accent text-on-accent',
    ghost: 'border-hair bg-surface text-primary',
    quiet: 'border-transparent bg-transparent text-muted',
  } as const;
  const sizes = { sm: 'h-8 px-3 text-[10.5px]', md: 'h-9 px-4 text-[11.5px]' } as const;
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-sm border font-mono font-bold uppercase tracking-[0.07em] ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── StatusChip ───────────────────────────────────────────────────────────
   Gold = live. Amber = drifting or reconnecting. Red = failed. The status is
   always carried by a WORD as well as a colour, so the design never depends
   on colour alone. */

export function StatusChip({
  tone,
  children,
  dot = true,
}: {
  tone: 'live' | 'warn' | 'error' | 'neutral';
  children: ReactNode;
  dot?: boolean;
}) {
  const tones = {
    live: 'text-live',
    warn: 'text-warn',
    error: 'text-error',
    neutral: 'text-muted',
  } as const;
  const dots = {
    live: 'bg-live',
    warn: 'bg-warn',
    error: 'bg-error',
    neutral: 'bg-muted',
  } as const;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-hair px-2 py-1">
      {dot ? <span className={`size-1.5 rounded-full ${dots[tone]}`} aria-hidden="true" /> : null}
      <span
        className={`font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] ${tones[tone]}`}
      >
        {children}
      </span>
    </span>
  );
}

/* ── Panel ────────────────────────────────────────────────────────────────
   A hairline-bordered surface. There are no shadows in this system (ADR-0012):
   depth comes from base -> surface -> raised plus the 1px edge. */

export function Panel({
  title,
  aside,
  children,
  className = '',
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-sm border border-hair bg-surface ${className}`}>
      {title ? (
        <header className="flex items-center gap-3 border-b border-hair px-4 py-2.5">
          <Label>{title}</Label>
          {aside ? <div className="ml-auto">{aside}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/* ── Field ────────────────────────────────────────────────────────────────
   Always a real <label> bound to a real <input>, never a div wearing a
   placeholder. Tab reaches it and a screen reader announces it. */

export function Field({
  id,
  label,
  hint,
  mono = false,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block">
        <Label>{label}</Label>
      </label>
      <input
        id={id}
        className={`w-full rounded-sm border border-hair bg-base px-3 py-2.5 text-[13px] text-primary ${mono ? 'font-mono tabular-nums' : ''}`}
        {...rest}
      />
      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-muted">{hint}</p> : null}
    </div>
  );
}

/* ── Meter ────────────────────────────────────────────────────────────────
   A 1px-tall bar for progress and for drift. Carries an accessible value, so
   it is not a decorative div. */

export function Meter({
  value,
  max = 100,
  tone = 'accent',
  label,
}: {
  value: number;
  max?: number;
  tone?: 'accent' | 'live' | 'warn';
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tones = { accent: 'bg-accent', live: 'bg-live', warn: 'bg-warn' } as const;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="relative h-[3px] w-full bg-hair"
    >
      <div className={`absolute inset-y-0 left-0 ${tones[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
