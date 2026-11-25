/**
 * Email as a value object.
 *
 * It exists for one reason: an email that has been through this type cannot be
 * in the wrong case or have stray whitespace, so nothing downstream has to
 * remember to normalise. `docs/05-patterns-and-algorithms.md` calls value
 * objects the cheapest win in the whole document — this is what that means in
 * practice.
 *
 * Normalising here rather than in the database also removes a dependency:
 * `citext` is a Postgres extension that is not available everywhere (PGlite,
 * which the tests run against, has no such type). Lowercasing at the domain
 * boundary plus a unique index on `lower(email)` is portable and does the same
 * job.
 */
import { InvalidEmail } from './errors.ts';

const SHAPE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export class Email {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  /** @throws InvalidEmail */
  static parse(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (value.length === 0) throw new InvalidEmail('email is empty');
    if (value.length > 254) throw new InvalidEmail('email is longer than 254 characters');
    if (!SHAPE.test(value)) throw new InvalidEmail('email is not shaped like an address');
    return new Email(value);
  }

  /** Non-throwing variant, for request parsing where a 400 is the answer. */
  static tryParse(raw: string): Email | null {
    try {
      return Email.parse(raw);
    } catch {
      return null;
    }
  }

  toString(): string {
    return this.#value;
  }

  equals(other: Email): boolean {
    return this.#value === other.#value;
  }
}
