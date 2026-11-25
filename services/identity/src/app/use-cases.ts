/**
 * The application layer: one function per thing a user can do.
 *
 * These hold WORKFLOW, not rules. "Only a non-expired, unspent token may be
 * rotated" is a rule and lives in `domain/session.ts`. "Look it up, ask the
 * domain, revoke on reuse, otherwise rotate" is workflow and lives here.
 */
import { Email } from '../domain/email.ts';
import { Password } from '../domain/password.ts';
import {
  EmailAlreadyRegistered,
  InvalidCredentials,
  RefreshTokenReused,
} from '../domain/errors.ts';
import { decideRotation, refreshExpiryFrom } from '../domain/session.ts';
import type {
  Clock,
  PasswordHasher,
  RefreshTokenMinter,
  SessionRepository,
  User,
  UserRepository,
} from '../ports.ts';

export type Deps = {
  users: UserRepository;
  sessions: SessionRepository;
  hasher: PasswordHasher;
  tokens: RefreshTokenMinter;
  clock: Clock;
};

export type IssuedSession = {
  user: User;
  sessionId: string;
  /** Returned to the client exactly once. Never stored, never logged. */
  refreshToken: string;
  refreshExpiresAt: Date;
};

/* ── register ─────────────────────────────────────────────────────────── */

export async function registerUser(
  deps: Deps,
  input: { email: string; password: string; userAgent?: string | null }
): Promise<IssuedSession> {
  const email = Email.parse(input.email);
  const password = Password.parse(input.password);

  const passwordHash = await deps.hasher.hash(password.expose());

  // No "does this email exist?" check first. That would be a race: two
  // concurrent registrations could both pass it. The unique index is the
  // authority, and the repository turns its violation into this error.
  const user = await deps.users.insert({ email, passwordHash });

  return openSession(deps, user, input.userAgent ?? null);
}

/* ── sign in ──────────────────────────────────────────────────────────── */

export async function signIn(
  deps: Deps,
  input: { email: string; password: string; userAgent?: string | null }
): Promise<IssuedSession> {
  const email = Email.tryParse(input.email);

  // A malformed address and an unknown one must be indistinguishable, and so
  // must a wrong password. Anything else is an account-enumeration oracle.
  const user = email === null ? null : await deps.users.findByEmail(email);

  if (user === null) {
    // Hash anyway. Returning early on an unknown address makes the response
    // measurably faster than a wrong password, which leaks exactly what the
    // uniform error message is there to hide.
    await deps.hasher.hash(input.password);
    throw new InvalidCredentials();
  }

  const ok = await deps.hasher.verify(user.passwordHash, input.password);
  if (!ok) throw new InvalidCredentials();

  return openSession(deps, user, input.userAgent ?? null);
}

/* ── refresh ──────────────────────────────────────────────────────────── */

export async function refreshSession(
  deps: Deps,
  input: { refreshToken: string }
): Promise<{ sessionId: string; refreshToken: string; refreshExpiresAt: Date; userId: string }> {
  const now = deps.clock.now();
  const presentedHash = deps.tokens.hashOf(input.refreshToken);
  const stored = await deps.sessions.findTokenByHash(presentedHash);

  const outcome = decideRotation(stored, now);

  if (outcome.kind === 'reuse-detected') {
    // Revoke first, then refuse. If this threw before revoking, a thief could
    // keep replaying the same leaked token against an intact family.
    await deps.sessions.revokeSession(outcome.revokeSession, now);
    throw new RefreshTokenReused(outcome.revokeSession);
  }

  const next = deps.tokens.mint();
  const expiresAt = refreshExpiryFrom(now);

  const rotated = await deps.sessions.rotate({
    spendTokenId: outcome.spend,
    sessionId: outcome.sessionId,
    nextTokenHash: next.hash,
    at: now,
    expiresAt,
  });

  // Null means another request spent this token between our read and our
  // write. Two live clients cannot both hold it, so this is the same leak
  // signal as a replay, just detected a few milliseconds earlier.
  if (rotated === null) {
    await deps.sessions.revokeSession(outcome.sessionId, now);
    throw new RefreshTokenReused(outcome.sessionId);
  }

  return {
    sessionId: outcome.sessionId,
    refreshToken: next.value,
    refreshExpiresAt: expiresAt,
    userId: rotated.userId,
  };
}

/* ── sign out ─────────────────────────────────────────────────────────── */

export async function signOut(deps: Deps, input: { refreshToken: string }): Promise<void> {
  const stored = await deps.sessions.findTokenByHash(deps.tokens.hashOf(input.refreshToken));
  if (stored === null) return; // already gone; signing out twice is not an error
  await deps.sessions.revokeSession(stored.sessionId, deps.clock.now());
}

/* ── shared ───────────────────────────────────────────────────────────── */

async function openSession(deps: Deps, user: User, userAgent: string | null): Promise<IssuedSession> {
  const now = deps.clock.now();
  const token = deps.tokens.mint();
  const expiresAt = refreshExpiryFrom(now);

  const { sessionId } = await deps.sessions.open({
    userId: user.id,
    tokenHash: token.hash,
    issuedAt: now,
    expiresAt,
    userAgent,
  });

  return { user, sessionId, refreshToken: token.value, refreshExpiresAt: expiresAt };
}

export { EmailAlreadyRegistered };
