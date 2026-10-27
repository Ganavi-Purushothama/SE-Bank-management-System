# Implementation and verification report

26 October 2026 · Team 6 Bank Management System

## Delivered

Implemented the previously documentation-only repository as a connected application in the existing Git checkout. Customer features: account-number/password login, current/available balance, deposits, withdrawals, confirmations, recent activity, paginated/date/type-filtered mini-statements, contact updates and logout. Administrator features: provision customers, generated unique account numbers, account search/details/history, customer access unlock, full-balance settlement/closure and security-event review.

The application uses the SAD's browser → Express → C++ rules architecture and the SRS's PostgreSQL persistence. Integer paise are used end to end; no binary floating-point financial calculations occur. C++ validates opening, deposit, withdrawal and settlement rules. Financial operations lock the authoritative account row and commit its balance and ledger together. Stable retry keys prevent duplicate deposit/withdrawal ledger entries. Passwords are salted scrypt hashes; opaque sessions, expiry/revocation, RBAC, ownership checks, CSRF/origin checks, generic authentication errors, persistent lockout, request limits, CSP/security headers and parameterized SQL are implemented.

The original SRS, SAD, STP, SRS PDF and UML diagrams remain unchanged. README was updated and its original bytes archived in `docs/original-readme.md` (matching Git blob `c2488c8fceae1a22192f471995162830d71058f2`). Parent-folder Word/PDF/templates were untouched. A discrepancy log and full requirement mapping are in `audit-and-decisions.md` and `traceability.md`.

## Important files

| Files | Result |
|---|---|
| `core/banking.hpp`, `core/main.cpp` | Stateless integer rules and strict bounded JSON IPC |
| `server/banking.js`, `core.js`, `db.js` | Banking orchestration, child-process adapter, PostgreSQL transactions/migration |
| `server/auth.js`, `crypto.js`, `validation.js` | Persisted sessions, hashing, lockout and validation |
| `server/app.js`, `index.js`, `config.js`, `errors.js` | API routing, startup/configuration and structured failures |
| `migrations/001_initial.sql` | Users, accounts, ledger, sessions, audit and migration records with constraints/indexes |
| `public/index.html`, `style.css`, `app.js` | Responsive connected customer/admin interface with accessible native forms/dialogs |
| `scripts/`, `.env.example`, package/lock/config files | Build, migrate, admin provisioning and portable disposable-DB verification |
| `tests/`, `playwright.config.js` | Rules/API/fault tests, actual PostgreSQL concurrency/load/startup and browser workflows |
| `.github/workflows/ci.yml` | CI definition for build, tests, lint, formatting and dependency audit; not yet run remotely |
| `README.md`, `docs/` | Setup, API/IPC, schema, architecture, security, demonstration and traceability |

The [API guide](api.md) documents every endpoint, inputs/access, results/errors and retry behavior. The [database guide](architecture-and-database.md) explains tables, transaction boundaries and migration/reset procedures. No existing database was reset, and no real account data or credentials were used.

## Final executed checks

Verified on Windows ARM64 with Node 24.13.0, npm 11.21.1, G++ 14.2.0, portable PostgreSQL 18.4 x64 under Windows emulation, and Playwright Chromium 156.

| Check | Actual result |
|---|---|
| `npm test` (includes `npm run build`) | **19 passed**, 0 failed, 0 skipped; real C++ plus isolated PGlite API tests |
| `$env:POSTGRES_BIN=<portable bin>; node scripts/test-postgres.mjs` | **18 passed**, 0 failed, 0 skipped; actual PostgreSQL/pg driver |
| `npm run test:e2e` | **3 passed**, 0 failed, 0 skipped; Chromium desktop/mobile |
| `npm run lint` | Passed, no lint errors |
| `npm run format:check` | Passed |
| `npm audit --audit-level=low` | **0 reported vulnerabilities** in the installed dependency graph at execution time |
| `git diff --check` | Passed; original tracked artifacts except README unchanged |
| Type checking | Not applicable: no TypeScript layer |
| Remote GitHub CI/public deployment | Not executed; workflow authored locally |

Counts overlap intentionally: the API suite runs once with PGlite and again with PostgreSQL. They are not a unique-coverage percentage. No coverage percentage is claimed.

Tests include malformed/oversized requests and wrong content types, login throttling, three-failure persistent lockout, admin unlock, session expiry/logout, CSRF/origin errors, role/ownership denial, mass assignment, injection strings, invalid/zero/negative/overprecision/oversized amounts, overdraft and retained-minimum rejection, ledger entries and balance changes, duplicate keys and key conflicts, concurrency and closure. A real SQL trigger deliberately fails ledger insertion after a balance update: the database rolls back the balance, returns a generic error and preserves the original ledger. An engine-failure test also preserves funds. Expected generic fault-test log entries do not indicate failing tests.

The PostgreSQL concurrency test sends ten duplicate deposits and ten competing withdrawals: duplicate deposits return one transaction; only four ₹200 withdrawals succeed against ₹1,001 with a ₹100 retained minimum, leaving ₹201. A second connection reads that committed balance. Startup tests run migration/admin/start entrypoints, restart the actual `server/index.js` process and verify the account, OPENING ledger and persisted session remain available.

Load check: **500 distinct customer sessions and 500 outstanding authenticated reads over 100 pooled HTTP sockets**; latest run total **252 ms**, p95 **229 ms**, including client queue time. All reads returned the correct account balance and the unchanged p95 <2-second assertion passed. A preceding unpooled 500-TCP-connection burst produced Windows connection refusals; increasing the accept backlog did not resolve that experiment. The final result establishes the documented pooled workload, not unrestricted 500-socket capacity or sustained production throughput.

Browser tests exercise the complete deposit/withdraw/history/admin workflow against the real API/C++/test database, cross-customer denial, closure session invalidation, logout, customer/admin navigation, masked passwords, native form validation, API loading/failure/retry, stored XSS rendered as literal text, and a 390px layout without document overflow. Dashboard/mobile screenshots were generated and visually reviewed. Initial test-locator failures introduced while extending XSS coverage were corrected; no assertion was removed.

## Running the normal application

The application is available on `main` following the merge of PR #13. The Sprint 1 evaluation kit links the actual GitHub evidence and current preparation gaps separately.

1. Install Node/G++/PostgreSQL and run `npm ci`, then `npm run build`.
2. Create a dedicated PostgreSQL role/database as described in README.
3. Copy `.env.example` to `.env`, supply DATABASE_URL, exact APP_ORIGIN and your own admin provisioning login/password.
4. Run `npm run migrate`, `npm run admin`, remove ADMIN_PASSWORD from `.env`.
5. Run `npm start` and open `http://localhost:3000` (or the exact configured APP_ORIGIN).

No production administrator/password is pre-seeded. The fixed fictional credentials in `docs/testing.md` work only in the disposable browser-test server. Normal development requires your own administrator and UI-created customer. Full commands and troubleshooting are in [README](../README.md).

## Remaining limitations and requirements decisions

- The SRS's literal C++ HTTP/libpq design and NF-005 C++ routing/DB module split are superseded here by the later explicit SAD Express/C++ IPC architecture. That literal implementation is **not** claimed. PostgreSQL and all 20 functional SRS requirements are implemented through the chosen architecture.
- Public HTTPS hosting/TLS, external payout integration, operational backups/disaster recovery, independent penetration testing and real-money suitability are not delivered or claimed. Closure records an authorized fictional settlement only.
- Independent first-time-user usability acceptance, Firefox/Edge/Safari verification and sustained mixed-write/public hosting load remain unexecuted. The unpooled TCP burst limitation remains recorded above.
- Browser financial retry keys remain in page memory; after reload, inspect history before retrying an uncertain operation. Current-balance closure occurs under a DB lock; a balance changed after opening the confirmation dialog can change the final settlement. The API returns the actual amount; versioned confirmation is a potential improvement.
- Permanent login lockout is intentionally denial-of-service-sensitive per SR-003. Admin identity recovery is an operator process. Rate limiting is single-process/in-memory. No MFA, password-reset flow or tamper-evident external audit exists; these are outside the submitted functional scope.
- At the initial verification, the CI workflow had not run remotely and no commit, push or pull request had been made. Publication is a subsequent user-requested step; check the pull request for current CI results. No merge, branch deletion or remote issue modification is part of publication.

See [security review](security.md) for severity, impact and remediation detail. Passing tests and a clean advisory scan do not establish that a system is fully secure.

## Existing issue references

Local setup follow-up: added `npm run local` to automate a persistent project-only PostgreSQL instance on loopback port 55432, migrations, administrator provisioning, environment backup/configuration, C++ compilation and app startup. The original system database authentication problem is avoided without resetting its passwords or changing its service. Verified the actual running application: health 200, administrator login 200 with ADMIN role, then successful logout. The launcher and config passed lint/format checks. Sign-in details and database state are stored in ignored `data/`; `.env.before-local` preserves the prior configuration. This is a development helper, not a production deployment.

Work is mapped to the existing tracker rather than creating duplicate issues: [#3 documentation](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/3), [#4 database/backend](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/4), [#5 banking core](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/5), [#6 core tests](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/6), [#7 authentication/security](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/7), [#8 account management](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/8), [#9 history](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/9), [#10 UI](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/10), [#11 integration/admin](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/11), [#12 integration/security/regression tests](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/12). These references do not close or update those issues.
