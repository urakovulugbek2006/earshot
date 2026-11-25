/** Domain errors. No HTTP status codes here — mapping those is the
 *  transport layer's job (docs/07-layers-and-ddd.md). */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidEmail extends DomainError {}
export class WeakPassword extends DomainError {}
export class EmailAlreadyRegistered extends DomainError {}

/** Deliberately says nothing about WHICH half was wrong. Telling an attacker
 *  that an address exists is an account-enumeration oracle. */
export class InvalidCredentials extends DomainError {
  constructor() {
    super('email or password is incorrect');
  }
}

export class RefreshTokenInvalid extends DomainError {}
export class RefreshTokenExpired extends DomainError {}

/** A refresh token that was already spent came back. The only way that
 *  happens is if it leaked, so the whole family is revoked. */
export class RefreshTokenReused extends DomainError {
  // Declared explicitly rather than as a constructor parameter property:
  // Node's type-stripping runs the file as-is after removing types, and a
  // parameter property is syntax that has to be *compiled*, not stripped.
  readonly sessionId: string;

  constructor(sessionId: string) {
    super('refresh token was already used; the session has been revoked');
    this.sessionId = sessionId;
  }
}
