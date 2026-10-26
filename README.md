# Bank Six — Bank Management System

Functional Team 6 academic banking application: HTML/CSS/JavaScript frontend, Node.js/Express API, a compiled C++ rules engine and PostgreSQL persistence. Customers can sign in, view their account, deposit/withdraw, browse filtered mini-statements and update contact details. Administrators create/search/view accounts, unlock access, close/settle accounts and review security events.

Original submitted [SRS](SRS.md), [SAD](SAD_Bank_Management_System.md), [STP](STP.md), PDFs and UML diagrams remain preserved. The previous README is archived in [docs/original-readme.md](docs/original-readme.md). See [audit and architecture decisions](docs/audit-and-decisions.md) for document conflicts and implementation policies.

## Requirements

- Node.js **22.12 or newer** and npm (verified with Node 24.13.0 / npm 11.21.1).
- GCC/G++ with C++17 support on PATH (verified with G++ 14.2.0). `CXX` can select another compatible compiler executable.
- PostgreSQL server and `psql` (verified with PostgreSQL 18.4 portable test binaries). A dedicated local PostgreSQL installation is recommended for development.
- A modern browser. Chromium automated tests are included.

## Run locally

Use the `implementation/bank-system` branch for the implemented application while its pull request is under review. The original project artifacts remain preserved.

### Easiest local startup

For this Windows checkout, PostgreSQL binaries are already available. Run:

```powershell
Set-Location "D:\PES\SEM-5\SE\Jackfruit\SE-Bank-management-System"
npm run local
```

This creates and reuses a project-owned PostgreSQL cluster at `data/local-postgres/cluster`, listening only on `127.0.0.1:55432`. It does not modify another PostgreSQL/MySQL installation or require its password. It creates a restricted application database role, runs migrations, provisions a local administrator, builds C++, and starts the app at **http://localhost:3000**. Leave that terminal running; Ctrl+C stops the app and the database started by that invocation. Saved bank accounts persist across restarts.

Open **`data/local-login.txt`** for your administrator login/password. An existing valid provisioning password is reused; otherwise a strong random password is generated. Do not share or commit that file. The original `.env` is backed up once to `.env.before-local`; the active `.env` receives the project database connection and removes ADMIN_PASSWORD after provisioning. Both files and all `data/` output are ignored by Git. The local launcher is for development only.

On another machine, install PostgreSQL binaries or set POSTGRES_BIN to their bin directory; the helper can also find the portable Windows distribution described in `docs/testing.md`. Port 55432 must be free on the first run. Existing application data is never reset by this command.

### Manual PostgreSQL setup

```powershell
git clone --branch implementation/bank-system https://github.com/Ganavi-Purushothama/SE-Bank-management-System.git
cd SE-Bank-management-System
npm ci
npm run build
Copy-Item .env.example .env
```

In an administrator `psql` session, create an application role and database. Choose your own password using psql's interactive password prompt:

```sql
CREATE ROLE bank_user LOGIN;
\password bank_user
CREATE DATABASE team6_bank OWNER bank_user;
```

Edit `.env`: set DATABASE_URL to that database (URL-encode special password characters), APP_ORIGIN to `http://localhost:3000`, ADMIN_LOGIN to your chosen admin login and ADMIN_PASSWORD to a unique password of at least 12 characters. Provisioning does not overwrite an existing administrator.

```powershell
npm run migrate
npm run admin
# Remove ADMIN_PASSWORD from .env after successful provisioning.
npm start
```

Open **http://localhost:3000** using exactly that hostname. Sign in with the admin you just created. Use **Open an account** to create a fictional customer with an initial deposit (default minimum ₹500). Save the generated account number, sign out, and sign in as that customer with the password you assigned. Deposits and withdrawals are academic ledger operations, not real payment processing.

Only one application terminal is needed. Express serves the frontend and invokes C++ automatically; do not run a separate frontend development server. PostgreSQL must already be running. On bash, copy the environment file with `cp .env.example .env`; other npm commands are the same.

## Configuration

| Variable | Meaning / default |
|---|---|
| DATABASE_URL | Required PostgreSQL connection URL; never committed |
| PORT / HOST | `3000` / `127.0.0.1` |
| APP_ORIGIN | Exact origin including port, no trailing slash; default `http://localhost:3000` |
| NODE_ENV | `development`; use `production` with HTTPS for public hosting |
| MIN_INITIAL_MINOR | Minimum opening deposit in paise, default `50000` (₹500) |
| MIN_BALANCE_MINOR | Retained minimum balance in paise, default `0`; cannot exceed initial minimum |
| SESSION_MINUTES | Absolute session lifetime, default `30`, range 1–1440 |
| ADMIN_LOGIN / ADMIN_PASSWORD | Used only by `npm run admin`; remove password after provisioning |
| CXX | Optional compiler executable for the build |
| POSTGRES_BIN | Optional PostgreSQL binary directory for disposable real-database tests |

Currency is INR; all stored and returned monetary balances use integer paise. No fees, interest, transfers, loans, public self-registration or external payouts are implemented. Closing an account records a full settlement and retains the ledger. Passwords use salted scrypt; sessions are persisted and revoked on logout, lockout and closure.

## Checks

```powershell
npm test
npm run test:postgres
npx playwright install chromium
npm run test:e2e
npm run lint
npm run format:check
npm audit
```

`npm test` compiles C++ and runs unit/API tests against disposable PGlite databases. `test:postgres` starts its own disposable PostgreSQL cluster (no system service modified), runs the API suite plus migration, actual row-locking, persistence and load tests, then stops it. ARM Windows needs POSTGRES_BIN; see [testing instructions](docs/testing.md). E2E runs the real UI/API/C++ against an isolated PGlite database. Tests never connect to DATABASE_URL. The frontend is static native JavaScript, so `build` compiles C++; there is no framework bundling or TypeScript step.

## Project layout and documentation

| Path | Purpose |
|---|---|
| `public/` | Responsive login, customer and administrative interface |
| `server/` | Express, validation, auth, banking service, SQL/IPC adapters |
| `core/` | C++ integer banking rules and strict JSON IPC executable |
| `migrations/` | Versioned PostgreSQL schema |
| `scripts/` | Compiler, migration, admin provisioning, real-DB test launcher |
| `tests/` | Unit, API, PostgreSQL/load and Chromium workflows |
| [API reference](docs/api.md) | Endpoints, payloads, errors, retry and IPC contracts |
| [Architecture/database](docs/architecture-and-database.md) | Data model, consistency, deployment and safe reset guidance |
| [Traceability](docs/traceability.md) | SRS → UI/service/database/test mapping |
| [Security review](docs/security.md) | Controls, findings, residual risks |
| [Testing](docs/testing.md) | Exact commands, runtime differences and demonstration workflow |
| [Implementation report](docs/implementation-report.md) | Actual verification results and remaining limitations |

## Troubleshooting

- **g++ not found:** install GCC/G++ and add its `bin` to PATH, reopen the terminal, then run `npm run build`. Compiled binaries are OS-specific and intentionally ignored by Git.
- **Banking engine unavailable:** build C++ from the repository root before starting the application; inspect the server request ID, not client stack traces.
- **Database connection refused:** start PostgreSQL, check the database/user/port and URL password encoding, then run migrate. No automatic database fallback occurs.
- **schema_migrations missing:** run `npm run migrate` against the same DATABASE_URL used for startup.
- **Origin/token error:** open exactly APP_ORIGIN, including hostname and port. Refresh/sign in after expiry. Local HTTP is for development; public production requires HTTPS.
- **Login unavailable after three failures:** an admin must unlock the customer's account. A locked administrator requires a trusted database operator to reset `locked=false,failed_attempts=0` for that specific admin after verifying their identity. No unauthenticated recovery backdoor is included.
- **Uncertain financial request after a connection failure:** retry the same amount in the open dialog; it reuses the key. If the page was reloaded, inspect transaction history first.
- **Port 4173 busy during E2E:** stop the prior isolated test server. Tests deliberately refuse to reuse an unknown server.

## Team 6

Ganavi Purushothama, DEVOPAM PAL, DEEPTHI V, Divyanshi Verma. Team and submitted requirement details remain in the original documents. This is a course project and has not been certified for real banking or publicly deployed.

<!-- The previous README is preserved verbatim in docs/original-readme.md. -->
