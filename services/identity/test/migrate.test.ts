/**
 * The migration runner's own tests.
 *
 * The checksum guard is the one worth having. Editing an applied migration
 * works perfectly on the machine where the change is also already in the
 * database, and does nothing at all on the server where it is not. Without a
 * checksum that divergence is silent until something downstream breaks for an
 * unrelated-looking reason.
 */
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { migrate } from '../src/migrate.ts';
import type { Sql } from '../src/adapters/postgres.ts';

describe('migrate', () => {
  let db: PGlite;
  let sql: Sql;
  let dir: string;

  beforeEach(() => {
    db = new PGlite();
    sql = db as unknown as Sql;
    dir = mkdtempSync(join(tmpdir(), 'earshot-migrations-'));
  });

  afterEach(async () => {
    await db.close();
  });

  const write = (name: string, body: string) => writeFileSync(join(dir, name), body);

  it('applies files in lexical order, not readdir order', async () => {
    // Written out of order on purpose: 0002 depends on the table 0001 makes,
    // so a runner that trusted readdir would fail here on some filesystems.
    write('0002_add_column.sql', `alter table public.widgets add column size int;`);
    write('0001_create.sql', `create table public.widgets (id serial primary key);`);

    const { applied } = await migrate(sql, dir);
    assert.deepEqual(applied, ['0001_create.sql', '0002_add_column.sql']);

    const { rows } = await sql.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_name = 'widgets' order by column_name`
    );
    assert.deepEqual(rows.map((r) => r.column_name), ['id', 'size']);
  });

  it('is idempotent: a second run applies nothing', async () => {
    write('0001_create.sql', `create table public.widgets (id serial primary key);`);
    const first = await migrate(sql, dir);
    const second = await migrate(sql, dir);

    assert.deepEqual(first.applied, ['0001_create.sql']);
    assert.deepEqual(second.applied, []);
    assert.deepEqual(second.skipped, ['0001_create.sql']);
  });

  it('refuses to run when an applied migration has been edited', async () => {
    write('0001_create.sql', `create table public.widgets (id serial primary key);`);
    await migrate(sql, dir);

    write('0001_create.sql', `create table public.widgets (id serial primary key, oops int);`);
    await assert.rejects(migrate(sql, dir), (err: Error) => {
      assert.match(err.message, /has changed since it was applied/);
      assert.match(err.message, /cannot be edited/);
      return true;
    });
  });

  it('leaves nothing behind when a migration fails halfway', async () => {
    write(
      '0001_broken.sql',
      `create table public.good (id int);
       create table public.bad (id int) this is not sql;`
    );

    await assert.rejects(migrate(sql, dir), /migration 0001_broken.sql failed/);

    // The whole file is one transaction, so the first statement must be gone
    // too. A half-applied migration is the worst outcome: the ledger says it
    // never ran, so a retry re-runs statements that already took effect.
    const { rows } = await sql.query<{ n: number }>(
      `select count(*)::int as n from information_schema.tables
        where table_schema = 'public' and table_name in ('good','bad')`
    );
    assert.equal(rows[0]!.n, 0, 'no table from the failed migration survived');

    const { rows: ledger } = await sql.query<{ n: number }>(
      `select count(*)::int as n from public.schema_migrations`
    );
    assert.equal(ledger[0]!.n, 0, 'a failed migration is not recorded as applied');
  });

  it('records a checksum so the guard has something to compare', async () => {
    write('0001_create.sql', `create table public.widgets (id serial primary key);`);
    await migrate(sql, dir);

    const { rows } = await sql.query<{ name: string; checksum: string }>(
      `select name, checksum from public.schema_migrations`
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.name, '0001_create.sql');
    assert.match(rows[0]!.checksum, /^[0-9a-f]{64}$/, 'sha-256 hex');
  });

  it('ignores files that are not .sql', async () => {
    write('0001_create.sql', `create table public.widgets (id serial primary key);`);
    write('README.md', 'not a migration');
    write('0002_notes.txt', 'also not a migration');

    const { applied } = await migrate(sql, dir);
    assert.deepEqual(applied, ['0001_create.sql']);
  });
});
