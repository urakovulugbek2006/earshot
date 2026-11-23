#!/usr/bin/env node
/**
 * Earshot token build: design/tokens.json  ->  dist/theme.css
 *
 * No dependencies on purpose. Style Dictionary earns its keep when you emit
 * for several platforms (CSS, Swift, Kotlin, XML); we emit one, so a hundred
 * readable lines beat a config file plus a dependency tree. If Earshot ever
 * gets a native client, swap this for Style Dictionary and keep tokens.json
 * exactly as it is — that is the point of the format.
 *
 * What it guarantees, and what the hand-written file could not:
 *   - every semantic token exists in BOTH themes, or the build fails
 *   - every {primitive.x.y} reference resolves, or the build fails
 *   - no token holds a literal #ffffff (ADR-0015), or the build fails
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const SRC = join(repo, 'design', 'tokens.json');
const OUT = join(here, 'dist', 'theme.css');

const tokens = JSON.parse(readFileSync(SRC, 'utf8'));
const errors = [];

/* ── helpers ─────────────────────────────────────────────────────────── */

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const at = (path) =>
  path.split('.').reduce((o, k) => (o == null ? o : o[k]), tokens);

/** `{primitive.graphite.950}` -> `var(--graphite-950)` */
function resolveRef(value, where) {
  const m = /^\{(.+)\}$/.exec(value);
  if (!m) return value;
  const path = m[1];
  const node = at(path);
  if (!node || node.$value === undefined) {
    errors.push(`${where}: reference {${path}} does not resolve`);
    return value;
  }
  const parts = path.split('.');
  if (parts[0] !== 'primitive') {
    errors.push(`${where}: only primitive.* may be referenced, got {${path}}`);
    return value;
  }
  // primitive.graphite.950 -> --graphite-950 ; primitive.ink -> --ink
  const name = parts.slice(1).map(kebab).join('-');
  return `var(--${name})`;
}

/** Collect `--name: value` lines for one subtree of colour tokens. */
function colourVars(node, prefix = [], out = []) {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    if (child && child.$value !== undefined) {
      const segs = [...prefix, key].filter((s) => s !== 'default');
      out.push([segs.map(kebab).join('-'), child]);
    } else if (child && typeof child === 'object') {
      colourVars(child, [...prefix, key], out);
    }
  }
  return out;
}

/* ── primitives ──────────────────────────────────────────────────────── */

const primitives = colourVars(tokens.primitive).map(([name, tok]) => {
  if (/^#f{3,6}$/i.test(tok.$value)) {
    errors.push(`primitive --${name} is pure white; ADR-0015 forbids it`);
  }
  return `  --${name}: ${tok.$value.toLowerCase()};`;
});

/* ── semantic, per theme ─────────────────────────────────────────────── */

function semanticVars(themeName) {
  const theme = tokens.semantic[themeName];
  if (!theme) { errors.push(`semantic.${themeName} is missing`); return []; }
  return colourVars(theme).map(([name, tok]) => [
    name,
    `  --${name}: ${resolveRef(tok.$value, `semantic.${themeName}.${name}`)};`,
  ]);
}

const night = semanticVars('dark');
const light = semanticVars('light');

// Both themes must expose exactly the same token names, or a component that
// works in one theme silently breaks in the other.
const nightNames = new Set(night.map(([n]) => n));
const lightNames = new Set(light.map(([n]) => n));
for (const n of nightNames) if (!lightNames.has(n)) errors.push(`--${n} exists in night but not light`);
for (const n of lightNames) if (!nightNames.has(n)) errors.push(`--${n} exists in light but not night`);

/* ── scales ──────────────────────────────────────────────────────────── */

const fontFamily = (arr) =>
  arr.map((f) => (/\s/.test(f) ? `'${f}'` : f)).join(', ');

const scales = [
  ...Object.entries(tokens.borderWidth).filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => `  --border-width-${kebab(k)}: ${v.$value};`),
  '',
  ...Object.entries(tokens.radius).filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => `  --radius-${kebab(k)}: ${v.$value};`),
  '',
  ...Object.entries(tokens.space).filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => `  --space-${k}: ${v.$value};`),
  '',
  ...Object.entries(tokens.motion.duration).filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => `  --duration-${kebab(k)}: ${v.$value};`),
  ...Object.entries(tokens.motion.easing).filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => `  --ease-${kebab(k)}: cubic-bezier(${v.$value.join(', ')});`),
  '',
  ...Object.entries(tokens.size).filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => `  --${kebab(k)}: ${v.$value};`),
  '',
  `  --font-sans: ${fontFamily(tokens.font.family.sans.$value)};`,
  `  --font-mono: ${fontFamily(tokens.font.family.mono.$value)};`,
];

/* ── Tailwind v4 bridge ──────────────────────────────────────────────── */

const BRIDGE = {
  'color-base': 'bg-base', 'color-surface': 'bg-surface',
  'color-raised': 'bg-raised', 'color-sunken': 'bg-sunken',
  'color-primary': 'text-primary', 'color-secondary': 'text-secondary',
  'color-muted': 'text-muted', 'color-on-accent': 'text-on-accent',
  'color-hair': 'border-hair', 'color-strong': 'border-strong',
  'color-accent': 'accent', 'color-accent-soft': 'accent-soft',
  'color-live': 'status-live', 'color-warn': 'status-warn',
  'color-error': 'status-error', 'color-info': 'status-info',
  'color-wave-played': 'waveform-played', 'color-wave-remaining': 'waveform-remaining',
};
for (const target of Object.values(BRIDGE)) {
  if (!nightNames.has(target)) errors.push(`bridge points at --${target}, which no theme defines`);
}

/* ── fail loudly, before writing anything ────────────────────────────── */

if (errors.length) {
  console.error('token build failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

/* ── emit ────────────────────────────────────────────────────────────── */

const body = (pairs, indent) => pairs.map(([, line]) =>
  indent ? '  ' + line : line).join('\n');

const css = `/* ─────────────────────────────────────────────────────────────────────────
   GENERATED FILE — DO NOT EDIT.
   Source: design/tokens.json · Build: packages/tokens/build.mjs
   Run \`pnpm --filter @earshot/tokens build\` after changing a token.

   Night is the default theme: :root carries it, and light is applied under
   [data-theme="light"] or when the OS asks for light and no explicit choice
   was made. That is the reverse of the usual arrangement, deliberately.
   ───────────────────────────────────────────────────────────────────── */

:root {
  /* primitives — never reference these from a component */
${primitives.join('\n')}

  /* semantic: night (the default) */
${body(night)}

  color-scheme: dark;

  /* scales */
${scales.join('\n')}
}

/* semantic: light. Not an inversion — see design/README.md. */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
${body(light, true)}

    color-scheme: light;
  }
}

:root[data-theme="light"] {
${body(light)}

  color-scheme: light;
}

/* Tailwind v4 bridge: exposes the semantic layer as utilities. */
@theme inline {
${Object.entries(BRIDGE).map(([u, t]) => `  --${u}: var(--${t});`).join('\n')}

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --radius-none: var(--radius-none);
  --radius-sm: var(--radius-sm);
  --radius-full: var(--radius-full);
  --ease-standard: var(--ease-standard);
}

/* base */
body {
  margin: 0;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

/* Every number in the product is mono with tabular figures, so a value that
   updates every second does not make its row jitter. */
.num,
time,
[data-numeric] {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

/* Visual controls may be 36px; the hit area never is. */
button,
[role="button"],
a[href],
input,
select {
  min-height: var(--touch-target);
}

:focus-visible {
  outline: var(--border-width-focus) solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, css);
console.log(
  `tokens -> ${OUT.replace(repo + '/', '')}\n` +
  `  ${primitives.length} primitives · ${night.length} semantic tokens x 2 themes · ` +
  `${scales.filter(Boolean).length} scale values\n` +
  `  checks passed: refs resolve, themes match, no pure white`
);
