# Installation and execution (SCRUM-39)

This guide runs the academic Bank Six application from a new checkout. Use only
fictional banking data. Express serves the browser files and calls the compiled
C++ engine; PostgreSQL is the persistent database. No separate frontend server,
TypeScript compiler, Docker installation or global npm package is required.

## Prerequisites

| Requirement | Purpose and verification |
|---|---|
| Git | Clone/check out the reviewed source; `git --version` |
| Node.js >=22.12 with npm | Server, scripts and locked dependencies; `node --version`, `npm --version` |
| GCC/G++ supporting C++17, on PATH | Compile the banking engine; `g++ --version`; set `CXX` to a compatible compiler executable if needed |
| PostgreSQL server binaries | Normal database or project-owned development cluster; `psql --version`; local helper requires `initdb` and `pg_ctl` too |
| Modern browser | Open the application at its configured origin |

Windows: install Node, Git for Windows, GCC/G++ (for example through MSYS2) and
PostgreSQL separately, add their executable directories to PATH, and reopen VS
Code/your terminal. On Linux/macOS install the same tools through your normal
package manager; run PostgreSQL initialization as a normal OS user, not root.
This project does not install OS tools or a database service automatically.

The supplied Windows commands use PowerShell unless a block says Bash or SQL.
Git Bash supports the npm/git commands; use `cp` instead of `Copy-Item`,
`export NAME=value` instead of `$env:NAME=value`, and `/c/...` paths where needed.

## Get source and dependencies

```bash
git clone https://github.com/Ganavi-Purushothama/SE-Bank-management-System.git
cd SE-Bank-management-System
# Until this work is merged, use the branch containing these instructions:
git switch codex/scrum-39-installation-execution
npm ci
npm run build
```

Use `main` once these changes are merged there. A branch must be published before
another machine can check it out. Avoid the old `implementation/bank-system`
checkout instructions for reviewing current sprint work. In an existing clone,
fetch the branch first and preserve any unrelated local changes before switching.

`npm ci` installs the versions from `package-lock.json`; it needs registry access
or a populated npm cache. It replaces `node_modules`, so use it in your intended
checkout. Runtime packages are Express, cookie-parser, express-rate-limit,
Helmet and pg. Development packages provide PGlite, embedded PostgreSQL,
Playwright, ESLint and Prettier; they are installed locally by the same command.

`npm run build` compiles `core/main.cpp` to `build/bank-core.exe` on Windows or
`build/bank-core` elsewhere with C++17 and warnings as errors. A clean checkout
has no binary: always build on the target OS. Do not copy another OS's binary.

Choose one database setup route below; do not combine the helper's generated
database credentials with an independently installed database.

## Route A: project-owned local PostgreSQL (development)

From the repository root after installing dependencies, point the helper at
PostgreSQL's binary directory if it is not found automatically:

```powershell
# Replace this example with the installed PostgreSQL version/path on your machine.
$env:POSTGRES_BIN = 'C:\Program Files\PostgreSQL\18\bin'
npm run local
```

```bash
# Git Bash example for the same optional setting:
export POSTGRES_BIN='C:/Program Files/PostgreSQL/18/bin'
npm run local
```

On Windows the helper also searches installed versions under Program Files and
`build/postgres-portable/package/native/bin`. On Linux/macOS set POSTGRES_BIN
explicitly to a directory containing `initdb`, `pg_ctl` and `postgres` if needed.
The portable download workaround for Windows ARM is in [testing.md](testing.md).

The helper initializes `data/local-postgres/cluster` on loopback port **55432**,
creates a restricted `bank_app` role and `team6_bank` database, migrates,
provisions a development admin, builds C++ and starts the application. It does
not install or change a system service. Port 55432 must be available for a new
cluster; PORT changes the HTTP port only.

Open **http://localhost:3000** by default. Read your generated administrator
login/password privately from `data/local-login.txt`. The helper uses an existing
valid ADMIN_PASSWORD on first setup or generates one, then removes it from the
active `.env`. It backs up an existing `.env` once to `.env.before-local` before
writing the project database settings. Do not share these files or commit them.

Keep the terminal open. Ctrl+C stops the app and the database started by this
invocation; a database already running before invocation is left running.
Restart with `npm run local`; the saved cluster and customer data are reused.
Keep `data/local-postgres/credentials.json` with its cluster. If credentials are
missing, restore them from your private backup; the helper does not reset data.

## Route B: an existing PostgreSQL installation

Start your PostgreSQL service using its normal OS tools. Connect as a database
administrator (replace the username/port if different):

```bash
psql -h localhost -p 5432 -U postgres -d postgres
```

Inside psql run the following SQL and password meta-command. Choose a unique
database-role password when prompted; do not paste it into shared logs.

```sql
CREATE ROLE bank_user LOGIN;
\password bank_user
CREATE DATABASE team6_bank OWNER bank_user;
\q
```

These commands are for a new role/database. If they already exist, verify their
ownership and credentials; do not drop or overwrite them. The application role
owns its dedicated database and needs schema/table creation for migrations; it
does not need PostgreSQL superuser privileges. For server-specific public-schema
permission errors, ask the DB administrator to grant that role CREATE/USAGE on
the dedicated database's public schema rather than making the role a superuser.

From the repository root copy the example **only if `.env` does not exist**:

```powershell
Copy-Item .env.example .env
```

Git Bash/Linux/macOS equivalent: `cp .env.example .env`.
Edit `.env` in your editor:

| Setting | Value to supply |
|---|---|
| DATABASE_URL | `postgresql://bank_user:YOUR_URL_ENCODED_PASSWORD@localhost:5432/team6_bank` |
| HOST / PORT | `127.0.0.1` / `3000` for local use |
| APP_ORIGIN | `http://localhost:3000` exactly, without a trailing slash |
| NODE_ENV | `development` for local HTTP |
| ADMIN_LOGIN | Your chosen login, 1–32 letters/digits/hyphens |
| ADMIN_PASSWORD | Your unique admin password, at least 12 characters and at most 128 UTF-8 bytes; replace the example placeholder |

The PostgreSQL-role password and banking-admin password are separate credentials.
URL-encode reserved characters in the DATABASE_URL password (for example `@` as
`%40` and `#` as `%23`). Quote environment values containing `#` so it is not
treated as a comment. Keep the default balance/session settings initially.
Exported shell variables take precedence over `.env`; clear stale values in the
current terminal if the app connects to an unexpected database or origin.

```powershell
npm run migrate
npm run admin
# Remove ADMIN_PASSWORD from .env after successful provisioning.
npm start
```

Migrations can be rerun. Run `npm run admin` once per new login; it does not reset
an existing administrator's password, and a duplicate login is an error. There
is no seeded production admin. `npm start` loads `.env` and serves the app; open
the exact APP_ORIGIN. Ctrl+C stops the application, leaving your independently
managed PostgreSQL service running. Restart with `npm start`; account data stays
in the configured database. Do not rerun clone/provisioning on each restart.

Changing the HTTP port requires matching PORT and APP_ORIGIN, for example `3001`
and `http://localhost:3001`. Always use the same hostname when signing in and
submitting forms; localhost and 127.0.0.1 are different origins.
