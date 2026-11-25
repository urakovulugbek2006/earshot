/**
 * Infrastructure: the Postgres implementations of the repository ports.
 *
 * Written against a minimal `Sql` interface rather than the `pg` Pool type, so
 * the same code runs against real Postgres in production and against PGlite
 * in tests. The tests therefore exercise real SQL — real constraints, real
 * transactions, real error codes — with no database server and no mocks. A
 * mocked repository would have proved nothing about the one thing that
 * matters here, which is whether the rotation is actually atomic.
 */
import { Email } from '../domain/email.ts';
import { EmailAlreadyRegistered } from '../domain/errors.ts';
import type { StoredRefreshToken } from '../domain/session.ts';
import type { SessionRepository, User, UserId, UserRepository } from '../ports.ts';

/** The slice of a client that both `pg` and PGlite provide. */
export interface Sql {
  query<R = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: R[] }>;

  /**
   * Run a script that contains several statements.
   *
   * `query` cannot be relied on for this. PGlite sends it over the extended
   * protocol, which permits exactly one statement and fails with "cannot
   * insert multiple commands into a prepared statement"; `pg` only gets away
   * with it because a parameterless query falls back to the simple protocol,
   * and stops getting away with it the moment a parameter is added.
   *
   * So multi-statement SQL — which in practice means migrations — goes
   * through here. PGlite provides it; for `pg`, `query` is the implementation.
   */
  exec?(text: string): Promise<unknown>;
}

/** Postgres raises this on any unique-index violation. */
const UNIQUE_VIOLATION = '23505';

/* ── users ────────────────────────────────────────────────────────────── */

export function makeUserRepository(sql: Sql): UserRepository {
  const toUser = (r: Record<string, unknown>): User => ({
    id: String(r['id']),
    email: String(r['email']),
    passwordHash: String(r['password_hash']),
    createdAt: new Date(String(r['created_at'])),
  });

  return {
    async findByEmail(email: Email) {
      // lower() on both sides so the functional unique index is actually used
      // rather than the planner falling back to a sequential scan.
      const { rows } = await sql.query(
        `select id, email, password_hash, created_at
           from identity.users
          where lower(email) = lower($1)
          limit 1`,
        [email.toString()]
      );
      return rows[0] ? toUser(rows[0]) : null;
    },

    async findById(id: UserId) {
      const { rows } = await sql.query(
        `select id, email, password_hash, created_at
           from identity.users
          where id = $1`,
        [id]
      );
      return rows[0] ? toUser(rows[0]) : null;
    },

    async insert({ email, passwordHash }) {
      try {
        const { rows } = await sql.query(
          `insert into identity.users (email, password_hash)
                values ($1, $2)
             returning id, email, password_hash, created_at`,
          [email.toString(), passwordHash]
        );
        return toUser(rows[0]!);
      } catch (err) {
        // No check-then-insert: the index decides, so two concurrent
        // registrations of the same address cannot both succeed.
        if ((err as { code?: string }).code === UNIQUE_VIOLATION) {
          throw new EmailAlreadyRegistered('that email is already registered');
        }
        throw err;
      }
    },
  };
}

/* ── sessions and refresh tokens ──────────────────────────────────────── */

export function makeSessionRepository(sql: Sql): SessionRepository {
  return {
    async open({ userId, tokenHash, issuedAt, expiresAt, userAgent }) {
      const { rows: s } = await sql.query(
        `insert into identity.sessions (user_id, user_agent, created_at)
              values ($1, $2, $3)
           returning id`,
        [userId, userAgent, issuedAt]
      );
      const sessionId = String(s[0]!['id']);

      const { rows: t } = await sql.query(
        `insert into identity.refresh_tokens (session_id, token_hash, issued_at, expires_at)
              values ($1, $2, $3, $4)
           returning id`,
        [sessionId, tokenHash, issuedAt, expiresAt]
      );
      return { sessionId, tokenId: String(t[0]!['id']) };
    },

    async findTokenByHash(tokenHash) {
      // Revocation lives on the session, because it is a property of the
      // whole family. Joining it in here means the domain sees one coherent
      // token record and never has to ask a second question.
      const { rows } = await sql.query(
        `select t.id, t.session_id, t.token_hash, t.issued_at, t.expires_at,
                t.used_at, s.revoked_at
           from identity.refresh_tokens t
           join identity.sessions s on s.id = t.session_id
          where t.token_hash = $1`,
        [tokenHash]
      );
      const r = rows[0];
      if (!r) return null;

      const stored: StoredRefreshToken = {
        id: String(r['id']),
        sessionId: String(r['session_id']),
        tokenHash: String(r['token_hash']),
        issuedAt: new Date(String(r['issued_at'])),
        expiresAt: new Date(String(r['expires_at'])),
        usedAt: r['used_at'] ? new Date(String(r['used_at'])) : null,
        revokedAt: r['revoked_at'] ? new Date(String(r['revoked_at'])) : null,
      };
      return stored;
    },

    async rotate({ spendTokenId, sessionId, nextTokenHash, at, expiresAt }) {
      await sql.query('begin');
      try {
        // `and used_at is null` is what makes this safe under concurrency:
        // two requests presenting the same token both reach here, and exactly
        // one updates a row. The loser gets zero rows and is told to treat it
        // as reuse, which is correct — two live clients cannot hold one token.
        const { rows: spent } = await sql.query(
          `update identity.refresh_tokens
              set used_at = $2
            where id = $1 and used_at is null
        returning session_id`,
          [spendTokenId, at]
        );
        if (spent.length === 0) {
          await sql.query('rollback');
          return null;
        }

        const { rows: next } = await sql.query(
          `insert into identity.refresh_tokens (session_id, token_hash, issued_at, expires_at)
                values ($1, $2, $3, $4)
             returning id`,
          [sessionId, nextTokenHash, at, expiresAt]
        );

        const { rows: owner } = await sql.query(
          `select user_id from identity.sessions where id = $1`,
          [sessionId]
        );

        await sql.query('commit');
        return { tokenId: String(next[0]!['id']), userId: String(owner[0]!['user_id']) };
      } catch (err) {
        await sql.query('rollback');
        throw err;
      }
    },

    async revokeSession(sessionId, at) {
      // Marking the family is enough — findTokenByHash joins it, so every
      // token in the family becomes unusable in one write.
      await sql.query(
        `update identity.sessions
            set revoked_at = $2
          where id = $1 and revoked_at is null`,
        [sessionId, at]
      );
    },

    async countActiveTokens(sessionId) {
      const { rows } = await sql.query(
        `select count(*)::int as n
           from identity.refresh_tokens t
           join identity.sessions s on s.id = t.session_id
          where t.session_id = $1
            and t.used_at is null
            and s.revoked_at is null`,
        [sessionId]
      );
      return Number(rows[0]!['n']);
    },
  };
}
