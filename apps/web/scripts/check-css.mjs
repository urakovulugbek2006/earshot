#!/usr/bin/env node
/**
 * Guards a failure mode seen once and never reproduced.
 *
 * While wiring this app up, a build completed green while the utilities used
 * inside @earshot/ui were absent from the stylesheet — the components would
 * have rendered unstyled with nothing reporting it. The cause was never
 * established: removing the @source line in globals.css does not reproduce it,
 * and .next does not accumulate stale stylesheets. So this check exists
 * precisely because the failure is unexplained. An unexplained silent failure
 * is the strongest possible argument for an assertion.
 *
 * It asserts that a sample of utilities, each used ONLY inside @earshot/ui,
 * reached the compiled stylesheet, and that both themes are present. Run after
 * `next build`. Verified to fail when a named utility is genuinely absent.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), '.next', 'static', 'css');

let files;
try {
  files = readdirSync(dir).filter((f) => f.endsWith('.css'));
} catch {
  console.error('check-css: no .next/static/css — run `pnpm build` first');
  process.exit(1);
}
if (files.length === 0) {
  console.error('check-css: no stylesheet was emitted');
  process.exit(1);
}

const css = files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');

// Each of these appears ONLY in packages/ui, never in apps/web.
const fromPackage = [
  'bg-surface',
  'text-muted',
  'text-accent',
  'border-hair',
  'text-live',
  'text-warn',
  'bg-accent',
  'tabular-nums',
];

// Both themes must be present, or the two-theme gallery shows one of them twice.
const themes = ['data-theme=dark', 'data-theme=light', 'prefers-color-scheme:light'];

const missing = [
  ...fromPackage
    .filter((u) => !new RegExp(`\\.${u}[,{ :]`).test(css))
    .map((u) => `.${u}`),
  ...themes.filter((t) => !css.includes(t)),
];

if (missing.length > 0) {
  console.error(
    'check-css FAILED — these did not reach the stylesheet:\n' +
      missing.map((m) => `  - ${m}`).join('\n') +
      '\n\nIf they are class names used inside a workspace package, that package\n' +
      'is probably missing an @source line in app/globals.css.'
  );
  process.exit(1);
}

console.log(
  `check-css ok · ${fromPackage.length} package utilities + both themes present`
);
