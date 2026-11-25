/**
 * Infrastructure: the two cryptographic ports.
 *
 * Deliberately separate from the domain. argon2 parameters are an operational
 * decision — they get retuned on the real server once its CPU is known
 * (docs/03-capacity-and-cost.md) — and the domain must not have an opinion
 * about that.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import type { PasswordHasher, RefreshTokenMinter } from '../ports.ts';

/**
 * `Algorithm.Argon2id` from @node-rs/argon2 is an ambient const enum, which
 * cannot be read under `verbatimModuleSyntax`. The numeric value is stable
 * (Argon2d=0, Argon2i=1, Argon2id=2) and the test that asserts a stored hash
 * begins with `$argon2id$` is what keeps this honest — if the binding ever
 * renumbers, that test fails rather than the wrong algorithm shipping quietly.
 */
const ARGON2ID = 2;

/**
 * OWASP's second recommended argon2id profile: 19 MiB, 2 iterations, 1 lane.
 * Memory is the parameter that actually costs an attacker — a GPU can
 * parallelise iterations far more cheaply than it can find 19 MiB per guess.
 *
 * Re-measure on the real server and raise these until a hash takes roughly
 * 250ms there. Faster than that is wasted safety margin; much slower and the
 * login endpoint becomes its own denial-of-service.
 */
const ARGON = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const argon2Hasher: PasswordHasher = {
  async hash(plain) {
    return argonHash(plain, ARGON);
  },
  async verify(hash, plain) {
    try {
      return await argonVerify(hash, plain, ARGON);
    } catch {
      // A malformed stored hash must read as "wrong password", not as a 500.
      // Otherwise the error itself distinguishes one account from another.
      return false;
    }
  },
};

/**
 * Refresh tokens: 256 bits from the OS CSPRNG, base64url so they survive a
 * cookie and a URL unescaped.
 */
export const refreshTokenMinter: RefreshTokenMinter = {
  mint() {
    const value = randomBytes(32).toString('base64url');
    return { value, hash: sha256(value) };
  },
  hashOf(value) {
    return sha256(value);
  },
};

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Constant-time comparison, for anywhere a secret is compared outside the
 *  database's own index lookup. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
