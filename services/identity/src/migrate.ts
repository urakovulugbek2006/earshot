/**
 * Migration runner.
 *
 * Deliberately small and dependency-free. It does the four things a migration
 * runner has to do and nothing else:
 *
 *   1. apply files in lexical order, so `0001_` runs before `0002_`
 *   2. record what has been applied, so a second run is a no-op
 *   3. run each file inside a transaction, so a failure leaves nothing half-done
 *   4. refuse to run if a file that was already applied has since changed
 *
 * (4) is the one people skip. Editing an applied migration works perfectly on
 * your machine, where the change is also in the database, and then does
 * nothing at all on the server, where it is not. Storing a checksum turns that
 * into a loud failure instead of a silent divergence.
 *
 * It runs against anything implementing `Sql`, so the same code path applies
 * migrations to production Postgres and to the PGlite instance in tests.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Sql } from './adapters/postgres.ts';

export type AppliedMigration = { name: string; checksum: string };

const LEDGER = `
  create table if not exists public.schema_migrations (
    name        text primary key,
    checksum    text        not null,
    applied_at  timestamptz not null default now()
  )
`;

export async function migrate(
  sql: Sql,
  dir: string,
  log: (msg: string) => void = () => {}
): Promise<{ applied: string[]; skipped: string[] }> {
  await sql.query(LEDGER);

  const { rows } = await sql.query<AppliedMigration>(
    `select name, checksum from public.schema_migrations`
  );
  const already = new Map(rows.map((r) => [r.name, r.checksum]));

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const name of files) {
    const body = readFileSync(join(dir, name), 'utf8');
    const checksum = createHash('sha256').update(body).digest('hex');
    const seen = already.get(name);

    if (seen !== undefined) {
      if (seen !== checksum) {
        throw new Error(
          `migration ${name} has changed since it was applied.\n` +
            `  recorded: ${seen.slice(0, 16)}…\n` +
            `  on disk:  ${checksum.slice(0, 16)}…\n` +
            `An applied migration is history and cannot be edited. Add a new one.`
        );
      }
      skipped.push(name);
      continue;
    }

    // Migrations are multi-statement scripts, so they go through `exec` where
    // the driver has one — see the note on Sql.exec for why `query` is not
    // safe for this.
    const runScript = sql.exec
      ? (text: string) => sql.exec!(text)
      : (text: string) => sql.query(text);

    await sql.query('begin');
    try {
      await runScript(body);
      await sql.query(
        `insert into public.schema_migrations (name, checksum) values ($1, $2)`,
        [name, checksum]
      );
      await sql.query('commit');
    } catch (err) {
      await sql.query('rollback');
      throw new Error(`migration ${name} failed: ${(err as Error).message}`, { cause: err });
    }

    applied.push(name);
    log(`applied ${name}`);
  }

  return { applied, skipped };
}
