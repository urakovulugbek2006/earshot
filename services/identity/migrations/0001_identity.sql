-- identity-svc owns this schema and nothing else owns any of it.
-- ADR-0005: one schema per service, no cross-schema reads. In production each
-- service connects as its own role with grants limited to its own schema, so
-- the rule is enforced by the database rather than agreed between humans.

create schema if not exists identity;

-- ── users ────────────────────────────────────────────────────────────────
create table if not exists identity.users (
  id            uuid primary key default gen_random_uuid(),
  email         text        not null,
  password_hash text        not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Case-insensitive uniqueness WITHOUT the citext extension. The domain
-- lowercases every address before it gets here (src/domain/email.ts), so this
-- index is the authority and the registration path has no check-then-insert
-- race: it inserts and lets the constraint decide.
create unique index if not exists users_email_lower_uq
  on identity.users (lower(email));

-- ── sessions ─────────────────────────────────────────────────────────────
-- One row per login on one device: a family of refresh tokens where each
-- replaces the last. Revocation is a property of the FAMILY, not of a single
-- token, because that is the unit reuse detection has to kill.
create table if not exists identity.sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references identity.users (id) on delete cascade,
  user_agent text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists sessions_user_idx
  on identity.sessions (user_id)
  where revoked_at is null;

-- ── refresh tokens ───────────────────────────────────────────────────────
create table if not exists identity.refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid        not null references identity.sessions (id) on delete cascade,
  -- SHA-256 of the token value. The value itself is never stored, so a dump
  -- of this table does not hand over working sessions. A fast hash is correct
  -- here: the token is already 256 bits of entropy, so there is nothing to
  -- brute-force and argon2 would only add latency to every refresh.
  token_hash text        not null,
  issued_at  timestamptz not null default now(),
  expires_at timestamptz not null,
  -- Non-null means spent. A spent token coming back is the leak signal.
  used_at    timestamptz
);

create unique index if not exists refresh_tokens_hash_uq
  on identity.refresh_tokens (token_hash);

create index if not exists refresh_tokens_session_idx
  on identity.refresh_tokens (session_id);

-- Finds the expired rows the cleanup job deletes. Partial, because spent and
-- unspent tokens are both collectable but the live ones must never be scanned.
create index if not exists refresh_tokens_expiry_idx
  on identity.refresh_tokens (expires_at);
