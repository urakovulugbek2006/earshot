/**
 * The password POLICY is domain. The hashing is not — that is infrastructure
 * behind the PasswordHasher port, because argon2 parameters are an operational
 * concern that gets retuned on real hardware (docs/03-capacity-and-cost.md).
 *
 * The rule here is length, not composition. Forced symbols and digits push
 * people toward "Password1!" — NIST dropped composition rules for that reason.
 */
import { WeakPassword } from './errors.ts';

const MIN = 10;
const MAX = 1024; // argon2 is linear in input; an unbounded password is a DoS.

export class Password {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  /** @throws WeakPassword */
  static parse(raw: string): Password {
    if (raw.length < MIN) throw new WeakPassword(`password must be at least ${MIN} characters`);
    if (raw.length > MAX) throw new WeakPassword(`password must be at most ${MAX} characters`);
    return new Password(raw);
  }

  /** Only the hasher should ever read this. */
  expose(): string {
    return this.#value;
  }

  /** Keeps the secret out of logs, traces and crash dumps. */
  toString(): string {
    return '[password]';
  }

  toJSON(): string {
    return '[password]';
  }
}
