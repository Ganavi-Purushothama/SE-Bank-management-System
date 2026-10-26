# SRS traceability

Original requirement documents are not retrospectively marked passed. This implementation mapping describes delivered behavior and verification; architectural differences and remaining acceptance work are explicit.

| SRS ID | UI | Endpoint/service/core | Tables | Verification |
|---|---|---|---|---|
| F-001 | Admin: Open an account | POST admin/accounts; banking.create; C++ OPENING | users/accounts/transactions/audit | API creation + browser admin workflow |
| F-002 | Generated account number confirmation/directory | server generation + UNIQUE constraints | users/accounts | API asserts different numbers |
| F-003 | Opening minimum guidance | config + C++ OPENING | accounts/transactions | core minimum and API rejection tests |
| F-004 | Admin directory/details | GET admin/accounts and accounts/:id | accounts/users | API admin search + browser details |
| F-005 | Admin Close & settle confirmation | POST admin/accounts/:id/close; C++ SETTLEMENT | accounts/transactions/sessions/audit | API settlement/closure/invalidation + browser workflow |
| F-006 | Customer Personal details | PATCH accounts/:id; banking.update | accounts/audit | API update/mass-assignment + browser persistence |
| F-007 | Login | POST login; auth.login/required | users/sessions | API valid/invalid login + browser workflow |
| F-008 | Password input | native type=password | none | browser masked-password assertion |
| F-009 | Generic login failure; admin unlock | failed counter + persistent lock + unlock endpoint | users/sessions/audit | API three failures/admin unlock |
| F-010 | Deposit modal/review | deposit route; C++ DEPOSIT | accounts/transactions | core/API/browser deposit balance checks |
| F-011 | Amount validation/error | validation.amount; C++ bounds | no mutation on error | zero/negative/non-numeric/precision/overflow tests |
| F-012 | Recent activity | atomic ledger write | transactions | API ledger count/type assertions |
| F-013 | Withdraw modal/review | withdraw route; C++ WITHDRAW | accounts/transactions | core/API/browser withdrawal balance checks |
| F-014 | Insufficient funds error | C++ min/available funds, SELECT FOR UPDATE | accounts | core minimum test, API overdraft and real PostgreSQL competing withdrawals |
| F-015 | Transaction list | atomic ledger write | transactions | API ledger + browser history |
| F-016 | Overview balance/details | GET accounts/:id; present | accounts | API exact balance + browser exact currency display |
| F-017 | Transaction history | persisted ledger, no hard deletes | transactions | API filtering and real DB ledger tests |
| F-018 | Recent five and paginated history | GET accounts/:id/transactions | transactions | API date/type/page validation + browser filtering |
| F-019 | Post-commit confirmations | pg transaction; rollback adapter | accounts/transactions | PostgreSQL API suite + injected trigger failure rollback |
| F-020 | Data loaded from DB every view | me/accounts read through pool | users/accounts/sessions | second-connection persistence assertion + authenticated views |
| NF-001 | Loading/errors | C++ timeout; request flow | all | PostgreSQL 500-read timing reported; interactive normal workflow verified; no universal deployment latency guarantee |
| NF-002 | Safe rejection | row locks, transaction rollback, unique retry key | accounts/transactions | injected SQL failure, concurrent withdrawals and duplicate submissions on real PostgreSQL |
| NF-003 | Native form constraints + inline errors | server schemas, parameterized SQL | all | validation fuzz, SQL payloads, RBAC and browser form checks |
| NF-004 | Consistent navigation/review dialogs | native HTML forms | none | browser workflows; independent first-time-user acceptance study still pending |
| NF-005 | Modular code | C++ rules + IPC separated; HTTP and DB use Express per SAD | all | source review; literal SRS C++ routing/libpq split is not implemented |
| NF-006 | Paginated directory/history | pool of ten connections, per-account locks | indexed tables | isolated 500 distinct customer-session read load test; not a sustained mixed-write/public hosting capacity certification |
| SR-001 | Auth-dependent workspace | cookie auth + ownership on every account route | users/sessions/accounts | 401, role, cross-account reads/writes tests |
| SR-002 | Masked password | scrypt salts/hash | users | password unit tests and DB hash assertion |
| SR-003 | Locked login; admin unlock | permanent lock until intervention; revoke sessions | users/sessions/audit | API lockout/unlock test |
| SR-004 | Separate admin nav | admin middleware + customer-only money operations | users | API forbidden admin routes + browser roles |
| SR-005 | Security activity | timestamped login/lockout/update/create/close/unlock events | audit_events | API audit assertion + browser activity |

SAD/STP additionally reference SQL injection prevention and HTTPS as SR-006/007; these IDs are absent from the actual SRS but their controls are implemented (parameterized queries, production HTTPS origin and secure cookie enforcement). Actual TLS termination remains an operator responsibility. STP NF-007 and SRS version/section references are similarly inconsistent; concurrency is tested under NF-002/006 here.

Tests use real compiled C++ for opening, deposit, withdrawal and settlement. PGlite fixtures serialize transactions because that engine has one connection. Only the dedicated PostgreSQL suite establishes multiconnection row-locking behavior. Browser tests use PGlite, not a mocked banking API; only the explicit API-failure UI test intercepts a request.

## Sprint 1 issue mapping (#4 and #5)

| Issue | Delivered by | Verification |
|---|---|---|
| #4 Database and backend foundation | `server/db.js` (pool, transaction wrapper, statement timeout query helper, ping, migration runner), `migrations/001_initial.sql` (schema, relationships, check constraints, audit index), `server/config.js` (env vars), `server/app.js` (health, database error mapping) | database health check, check constraint enforcement, and rollback tests in `tests/api.test.js` and `tests/postgres.test.js` |
| #5 Core banking transactions | `server/banking.js` (deposit, withdraw, settlement, audit trail), `core/banking.hpp` & `core/main.cpp` (C++ integer arithmetic, overdraft vs min-balance distinction, stderr diagnostics) | C++ unit boundary tests and financial operation tests in `tests/core.test.js` and `tests/api.test.js` |


