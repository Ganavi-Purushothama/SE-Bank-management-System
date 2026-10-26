CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE users (
 id uuid PRIMARY KEY, login varchar(32) UNIQUE NOT NULL,
 password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('CUSTOMER','ADMIN')),
 failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts BETWEEN 0 AND 3),
 locked boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE accounts (
 id uuid PRIMARY KEY, number varchar(16) NOT NULL UNIQUE,
 user_id uuid NOT NULL UNIQUE REFERENCES users(id), name varchar(100) NOT NULL,
 phone varchar(30) NOT NULL DEFAULT '', address varchar(300) NOT NULL DEFAULT '',
 type text NOT NULL DEFAULT 'SAVINGS' CHECK(type='SAVINGS'),
 balance bigint NOT NULL DEFAULT 0 CHECK(balance BETWEEN 0 AND 9000000000000),
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','CLOSED')),
 created_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz,
 CHECK(status <> 'CLOSED' OR balance=0)
);
CREATE TABLE sessions (
 token_hash char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
 csrf_token char(64) NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE transactions (
 id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES accounts(id),
 type text NOT NULL CHECK(type IN ('DEPOSIT','WITHDRAW','OPENING','SETTLEMENT')),
 amount bigint NOT NULL CHECK(amount BETWEEN 1 AND 9000000000000),
 balance_after bigint NOT NULL CHECK(balance_after BETWEEN 0 AND 9000000000000),
 request_key varchar(100) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,request_key)
);
CREATE INDEX transactions_history_idx ON transactions(account_id,created_at DESC,id);
CREATE INDEX accounts_name_idx ON accounts(lower(name));
CREATE TABLE audit_events (
 id uuid PRIMARY KEY, actor_id uuid REFERENCES users(id), account_id uuid REFERENCES accounts(id),
 event varchar(60) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations(version) VALUES (1);
