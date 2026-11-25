/**
 * Refresh tokens, and the rule that makes them worth having.
 *
 * A SESSION is one login on one device — a family of refresh tokens where each
 * one replaces the last. A refresh token is single-use: spending it issues a
 * successor and marks the old one spent.
 *
 * The rule that matters is what happens when a SPENT token comes back. A
 * legitimate client never does that: it discarded the old token the moment it
 * got the new one. So a replay means a copy exists somewhere it should not —
 * the token leaked from storage, a log, or a proxy. We cannot tell whether the
 * caller is the victim or the thief, so we revoke the whole family and make
 * both sign in again. This is the OAuth 2 BCP recommendation for public
 * clients, and it is the only cheap way to bound the damage from a leak.
 *
 * All of this is pure: no SQL, no crypto, no clock of its own. The decision is
 * a function of the stored token plus "now", which is what makes it testable
 * with a struct literal and no database (docs/07-layers-and-ddd.md).
 */
import { RefreshTokenExpired, RefreshTokenInvalid, RefreshTokenReused } from './errors.ts';

export type SessionId = string;
export type TokenId = string;

/** A refresh token as it is stored. The token VALUE is never kept — only a
 *  hash of it, so a database leak does not hand over working sessions. */
export type StoredRefreshToken = {
  id: TokenId;
  sessionId: SessionId;
  /** SHA-256 of the token value. Not a password: it is high-entropy already,
   *  so a fast hash is correct here and argon2 would only add latency. */
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  /** Set the moment the token is spent. Non-null means "already used". */
  usedAt: Date | null;
  /** Set when the family is revoked, by reuse detection or by signing out. */
  revokedAt: Date | null;
};

export type RotationOutcome =
  | { kind: 'rotate'; spend: TokenId; sessionId: SessionId }
  | { kind: 'reuse-detected'; revokeSession: SessionId };

/**
 * Decide what to do with a presented refresh token.
 *
 * Returns `reuse-detected` rather than throwing, because the caller has work
 * to do — revoke the family — before the request can fail. Everything else
 * throws, because there is nothing to do but refuse.
 *
 * @throws RefreshTokenInvalid  unknown token, or its family is already revoked
 * @throws RefreshTokenExpired  past its expiry
 */
export function decideRotation(
  token: StoredRefreshToken | null,
  now: Date
): RotationOutcome {
  if (token === null) {
    throw new RefreshTokenInvalid('refresh token is not recognised');
  }

  // Order matters. Reuse is checked BEFORE expiry: a replayed token that also
  // happens to be expired is still a leak, and still has to revoke the family.
  if (token.usedAt !== null) {
    return { kind: 'reuse-detected', revokeSession: token.sessionId };
  }

  if (token.revokedAt !== null) {
    throw new RefreshTokenInvalid('session has been revoked');
  }

  if (token.expiresAt.getTime() <= now.getTime()) {
    throw new RefreshTokenExpired('refresh token has expired');
  }

  return { kind: 'rotate', spend: token.id, sessionId: token.sessionId };
}

/** Throwing form, for callers that have already handled revocation. */
export function assertRotatable(token: StoredRefreshToken | null, now: Date): RotationOutcome {
  const outcome = decideRotation(token, now);
  if (outcome.kind === 'reuse-detected') {
    throw new RefreshTokenReused(outcome.revokeSession);
  }
  return outcome;
}

/** 30 days. Long enough that a daily listener is never signed out; short
 *  enough that an abandoned device stops working within a month. */
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 15 minutes. The access token is the one sent on every request, so its
 *  lifetime is the window an attacker gets from a single stolen request. */
export const ACCESS_TTL_MS = 15 * 60 * 1000;

export function refreshExpiryFrom(now: Date): Date {
  return new Date(now.getTime() + REFRESH_TTL_MS);
}
