/**
 * These run against real PostgreSQL — PGlite, the engine compiled to WASM —
 * so the constraints, the transactions and the error codes are the real ones.
 * No repository is mocked. A mock would have proved nothing about the only
 * question that matters here: whether the rotation is actually atomic.
 *
 * (The container this was written in has no Docker daemon, so testcontainers
 * was not an option. It turned out to be the better default anyway: these run
 * in about a second with no daemon, which means they run on every save.)
 */
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

import { migrate } from '../src/migrate.ts';

import { Email } from '../src/domain/email.ts';
import { Password } from '../src/domain/password.ts';
import {
  EmailAlreadyRegistered,
  InvalidCredentials,
  InvalidEmail,
  RefreshTokenExpired,
  RefreshTokenInvalid,
  RefreshTokenReused,
  WeakPassword,
} from '../src/domain/errors.ts';
import { decideRotation, type StoredRefreshToken } from '../src/domain/session.ts';
import { argon2Hasher, refreshTokenMinter } from '../src/adapters/crypto.ts';
import { makeSessionRepository, makeUserRepository, type Sql } from '../src/adapters/postgres.ts';
import {
  refreshSession,
  registerUser,
  signIn,
  signOut,
  type Deps,
} from '../src/app/use-cases.ts';
import type { Clock } from '../src/ports.ts';

/* ── pure domain ──────────────────────────────────────────────────────── */

describe('Email', () => {
  it('normalises case and whitespace', () => {
    assert.equal(Email.parse('  Mara@Example.COM ').toString(), 'mara@example.com');
  });

  it('rejects what is not an address', () => {
    for (const bad of ['', '   ', 'mara', 'mara@', '@example.com', 'a b@c.d', 'mara@example']) {
      assert.throws(() => Email.parse(bad), InvalidEmail, `should reject ${JSON.stringify(bad)}`);
    }
  });

  it('rejects an address longer than the RFC limit', () => {
    assert.throws(() => Email.parse('a'.repeat(250) + '@b.co'), InvalidEmail);
  });

  it('tryParse returns null instead of throwing', () => {
    assert.equal(Email.tryParse('nope'), null);
    assert.ok(Email.tryParse('a@b.co'));
  });
});

describe('Password', () => {
  it('requires length, not composition', () => {
    assert.throws(() => Password.parse('short'), WeakPassword);
    assert.ok(Password.parse('correct horse battery'));
  });

  it('caps length, because argon2 is linear in input', () => {
    assert.throws(() => Password.parse('x'.repeat(1025)), WeakPassword);
  });

  it('never prints itself', () => {
    const p = Password.parse('super secret value');
    assert.equal(String(p), '[password]');
    assert.equal(JSON.stringify({ p }), '{"p":"[password]"}');
    assert.ok(!JSON.stringify({ p }).includes('secret'));
  });
});

describe('decideRotation', () => {
  const base: StoredRefreshToken = {
    id: 't1',
    sessionId: 's1',
    tokenHash: 'h',
    issuedAt: new Date('2026-01-01T00:00:00Z'),
    expiresAt: new Date('2026-02-01T00:00:00Z'),
    usedAt: null,
    revokedAt: null,
  };
  const now = new Date('2026-01-10T00:00:00Z');

  it('rotates a live, unspent token', () => {
    assert.deepEqual(decideRotation(base, now), {
      kind: 'rotate',
      spend: 't1',
      sessionId: 's1',
    });
  });

  it('refuses a token it has never seen', () => {
    assert.throws(() => decideRotation(null, now), RefreshTokenInvalid);
  });

  it('reports reuse for a spent token', () => {
    assert.deepEqual(decideRotation({ ...base, usedAt: now }, now), {
      kind: 'reuse-detected',
      revokeSession: 's1',
    });
  });

  it('treats a spent AND expired token as reuse, not as expiry', () => {
    // Order matters: a replay is still a leak even if the token had expired,
    // and the family still has to be revoked.
    const spentAndExpired = { ...base, usedAt: now, expiresAt: new Date('2026-01-02T00:00:00Z') };
    assert.equal(decideRotation(spentAndExpired, now).kind, 'reuse-detected');
  });

  it('refuses a revoked family', () => {
    assert.throws(() => decideRotation({ ...base, revokedAt: now }, now), RefreshTokenInvalid);
  });

  it('refuses an expired token', () => {
    const expired = { ...base, expiresAt: new Date('2026-01-05T00:00:00Z') };
    assert.throws(() => decideRotation(expired, now), RefreshTokenExpired);
  });

  it('treats the expiry instant itself as expired', () => {
    assert.throws(() => decideRotation({ ...base, expiresAt: now }, now), RefreshTokenExpired);
  });
});


/* ── the database under test ──────────────────────────────────────────── */

const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url));

let pglite: PGlite | null = null;
let pgClient: pg.Client | null = null;

async function connect(): Promise<Sql> {
  const url = process.env['DATABASE_URL'];
  if (url) {
    pgClient = new pg.Client({ connectionString: url });
    await pgClient.connect();
    const sql = pgClient as unknown as Sql;
    await migrate(sql, MIGRATIONS);
    // A real server keeps its rows between runs, and these tests assume an
    // empty table. Cascade reaches sessions and refresh_tokens.
    await sql.query('truncate identity.users cascade');
    return sql;
  }
  pglite = new PGlite();
  const sql = pglite as unknown as Sql;
  await migrate(sql, MIGRATIONS);
  return sql;
}

async function disconnect(): Promise<void> {
  if (pgClient) await pgClient.end();
  if (pglite) await pglite.close();
  pgClient = null;
  pglite = null;
}

/* ── against real Postgres ────────────────────────────────────────────── */

describe(`identity service [${process.env['DATABASE_URL'] ? 'real postgres' : 'pglite'}]`, () => {
  let deps: Deps;
  let clock: { current: Date } & Clock;

  before(async () => {
    // Same suite, either engine. Without DATABASE_URL it runs on PGlite
    // (PostgreSQL 19 in WASM, no daemon, ~2s). With it, the identical tests
    // run against a real server — which is what proves PGlite is not lying:
    // it is a different major version from the one production pins, and a
    // test suite that only ever sees one engine cannot tell you that.
    const sql = await connect();
    clock = {
      current: new Date('2026-03-01T12:00:00Z'),
      now() {
        return this.current;
      },
    };
    deps = {
      users: makeUserRepository(sql),
      sessions: makeSessionRepository(sql),
      hasher: argon2Hasher,
      tokens: refreshTokenMinter,
      clock,
    };
  });

  after(async () => {
    await disconnect();
  });

  it('registers a user and opens a session', async () => {
    const out = await registerUser(deps, {
      email: 'Mara@Example.com',
      password: 'correct horse battery',
    });
    assert.equal(out.user.email, 'mara@example.com', 'stored address is normalised');
    assert.ok(out.sessionId);
    assert.ok(out.refreshToken.length > 20);
    assert.ok(!out.user.passwordHash.includes('correct'), 'password is not stored in the clear');
    assert.ok(out.user.passwordHash.startsWith('$argon2id$'), 'hashed with argon2id');
  });

  it('refuses a second registration of the same address, ignoring case', async () => {
    await assert.rejects(
      registerUser(deps, { email: 'MARA@EXAMPLE.COM', password: 'another good one' }),
      EmailAlreadyRegistered
    );
  });

  it('signs in with the right password', async () => {
    const out = await signIn(deps, { email: 'mara@example.com', password: 'correct horse battery' });
    assert.ok(out.refreshToken);
    assert.equal(out.user.email, 'mara@example.com');
  });

  it('gives the same error for a wrong password, an unknown address and a malformed one', async () => {
    const errors: string[] = [];
    for (const input of [
      { email: 'mara@example.com', password: 'wrong password here' },
      { email: 'nobody@example.com', password: 'correct horse battery' },
      { email: 'not-an-address', password: 'correct horse battery' },
    ]) {
      await signIn(deps, input).then(
        () => assert.fail('should not sign in'),
        (e: Error) => errors.push(e.message)
      );
    }
    assert.equal(new Set(errors).size, 1, 'all three must be indistinguishable');
    assert.ok(errors[0]!.includes('email or password'));
  });

  it('rotates: the new token works and the old one stops working', async () => {
    const first = await signIn(deps, {
      email: 'mara@example.com',
      password: 'correct horse battery',
    });

    const second = await refreshSession(deps, { refreshToken: first.refreshToken });
    assert.notEqual(second.refreshToken, first.refreshToken, 'a fresh token is issued');
    assert.equal(second.sessionId, first.sessionId, 'still the same session');
    assert.ok(second.userId, 'the owner comes back with the rotation, in one round trip');

    const third = await refreshSession(deps, { refreshToken: second.refreshToken });
    assert.ok(third.refreshToken);
  });

  it('detects reuse: replaying a spent token revokes the whole family', async () => {
    const first = await signIn(deps, {
      email: 'mara@example.com',
      password: 'correct horse battery',
    });
    const second = await refreshSession(deps, { refreshToken: first.refreshToken });

    // The leaked token comes back.
    await assert.rejects(
      refreshSession(deps, { refreshToken: first.refreshToken }),
      RefreshTokenReused
    );

    // And the token the legitimate client was holding is dead too. That is the
    // point: we cannot tell victim from thief, so both are signed out.
    await assert.rejects(
      refreshSession(deps, { refreshToken: second.refreshToken }),
      RefreshTokenInvalid
    );

    assert.equal(
      await deps.sessions.countActiveTokens(first.sessionId),
      0,
      'no live tokens remain in the family'
    );
  });

  it('survives two requests racing for the same token', async () => {
    const start = await signIn(deps, {
      email: 'mara@example.com',
      password: 'correct horse battery',
    });

    // Both presented the same token. Exactly one may win; the loser must be
    // treated as a leak, because two live clients cannot hold one token.
    const [a, b] = await Promise.allSettled([
      refreshSession(deps, { refreshToken: start.refreshToken }),
      refreshSession(deps, { refreshToken: start.refreshToken }),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === 'fulfilled');
    const rejected = [a, b].filter((r) => r.status === 'rejected');
    assert.equal(fulfilled.length, 1, 'exactly one rotation succeeds');
    assert.equal(rejected.length, 1);
    assert.ok(
      (rejected[0] as PromiseRejectedResult).reason instanceof RefreshTokenReused,
      'the loser is treated as reuse'
    );
  });

  it('expires a refresh token once its lifetime has passed', async () => {
    const out = await signIn(deps, {
      email: 'mara@example.com',
      password: 'correct horse battery',
    });
    clock.current = new Date(out.refreshExpiresAt.getTime() + 1000);
    await assert.rejects(
      refreshSession(deps, { refreshToken: out.refreshToken }),
      RefreshTokenExpired
    );
    clock.current = new Date('2026-03-01T12:00:00Z');
  });

  it('signs out, and signing out twice is not an error', async () => {
    const out = await signIn(deps, {
      email: 'mara@example.com',
      password: 'correct horse battery',
    });
    await signOut(deps, { refreshToken: out.refreshToken });
    await assert.rejects(
      refreshSession(deps, { refreshToken: out.refreshToken }),
      RefreshTokenInvalid
    );
    await signOut(deps, { refreshToken: out.refreshToken });
    await signOut(deps, { refreshToken: 'a token that never existed' });
  });

  it('rejects a credential that was never issued', async () => {
    await assert.rejects(
      refreshSession(deps, { refreshToken: 'definitely-not-a-real-token' }),
      RefreshTokenInvalid
    );
  });
});
