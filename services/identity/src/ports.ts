/**
 * The interfaces the domain declares and infrastructure implements.
 *
 * This file is why `src/domain` imports nothing but the standard library. The
 * dependency arrow points INWARD: the Postgres adapter depends on these types,
 * not the other way round (docs/07-layers-and-ddd.md).
 */
import type { Email } from './domain/email.ts';
import type { SessionId, StoredRefreshToken, TokenId } from './domain/session.ts';

export type UserId = string;

export type User = {
  id: UserId;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

/** Injected rather than read from `Date.now()`, so expiry and rotation can be
 *  tested at an exact instant instead of with sleeps. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  /** Must be constant-time against the stored hash. */
  verify(hash: string, plain: string): Promise<boolean>;
}

export interface RefreshTokenMinter {
  /** `value` goes to the client exactly once; only `hash` is ever stored. */
  mint(): { value: string; hash: string };
  hashOf(value: string): string;
}

export interface UserRepository {
  findByEmail(email: Email): Promise<User | null>;
  findById(id: UserId): Promise<User | null>;
  /** @throws EmailAlreadyRegistered on a unique-index violation. Letting the
   *  database decide avoids the check-then-insert race entirely. */
  insert(input: { email: Email; passwordHash: string }): Promise<User>;
}

export interface SessionRepository {
  /** Opens a new family and returns its first refresh token. */
  open(input: {
    userId: UserId;
    tokenHash: string;
    issuedAt: Date;
    expiresAt: Date;
    userAgent: string | null;
  }): Promise<{ sessionId: SessionId; tokenId: TokenId }>;

  findTokenByHash(tokenHash: string): Promise<StoredRefreshToken | null>;

  /**
   * Spend `spendTokenId` and issue its successor, in ONE transaction.
   *
   * Atomicity is the whole point: if the two halves could be separated, a
   * crash between them would either spend a token without issuing a
   * replacement (signing the user out) or issue two live tokens from one
   * (defeating single-use). Returns null if the token was already spent by a
   * concurrent request, which the caller must treat as reuse.
   *
   * Returns the owner too, so refreshing costs one round trip rather than two.
   */
  rotate(input: {
    spendTokenId: TokenId;
    sessionId: SessionId;
    nextTokenHash: string;
    at: Date;
    expiresAt: Date;
  }): Promise<{ tokenId: TokenId; userId: UserId } | null>;

  /** Revokes every token in the family. Used on sign-out and on reuse. */
  revokeSession(sessionId: SessionId, at: Date): Promise<void>;

  countActiveTokens(sessionId: SessionId): Promise<number>;
}
