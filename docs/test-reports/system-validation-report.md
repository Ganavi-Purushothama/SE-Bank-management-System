# System Validation Report

Execution date: **11 November 2026 (Asia/Calcutta)**. Tested source: `729f5c35e3aba21da91585636fd6fea87bcc6e43` (main after PR #23). Environment: Windows, Node 24.22.1 (x64), npm 11.19.1, G++/gcov 16.2.0, PostgreSQL 18.4, Playwright 1.64.1 / Chromium.

## Execution summary

| Run | Passed | Failed | Skipped | Evidence |
|---|---:|---:|---:|---|
| Unit plus API/statement regression with Node coverage and PGlite | 41 | 0 | 1 | [JavaScript output](evidence/javascript-coverage.txt) |
| Real PostgreSQL integration with Node coverage | 30 | 0 | 0 | [PostgreSQL output](evidence/postgres-coverage.txt) |
| Playwright Chromium workflows | 4 | 0 | 0 | [Browser output](evidence/browser-tests.txt) |

All final commands exited 0. The default suite discovers 42 tests; the skipped concurrent statement-snapshot case requires real PostgreSQL and passed in that run. Suites overlap. Browser tests use an isolated PGlite-backed server; they are not real-PostgreSQL browser tests.

## Validation against the Test Plan

| Area | Executed checks | Result |
|---|---|---|
| Authentication and authorization | Login, lockout/unlock, role/ownership denial, forged/old sessions, expiry/logout, current-password verification and password-change session revocation | Passed |
| Account management | Creation, unique account identity, minimum opening, update validation, closure/settlement and revoked access | Passed |
| Financial operations | Exact paise, invalid/oversized/negative amounts, overdraft/minimum rejection, duplicate/key-conflict requests | Passed |
| Atomicity and audit | Injected ledger insert failure and audit insert failure preserve original balance/ledger; same-key retry commits once after recovery | Passed |
| Database integrity | Check constraints, repeatable migration, independent connection reads and restart persistence | Passed |
| Concurrency | Ten same-key deposits create one transaction; four of ten INR 200 withdrawals succeed against INR 1,001 with INR 100 retained minimum, leaving INR 201 | Passed |
| Statements | Ownership, date boundaries, reconciliation, full results/limits and concurrent snapshot isolation | Passed |
| Browser workflow | Banking/admin lifecycle, statement CSV/print flow, validation/auth errors, loading/failure states and mobile layout | Four scenarios passed |
| Local read workload | 500 valid customer sessions over 100 pooled HTTP sockets | 463 ms total; p95 231 ms in this instrumented PostgreSQL run |

These are local workload measurements, not production throughput guarantees. PostgreSQL tests create their own loopback cluster, generated credentials and per-fixture schemas and stop the cluster afterward. Normal application DATABASE_URL and customer data are not used.

## Findings and Test Plan differences

No assertion failed. Expected request_failed/P0001/INTERNAL messages are deliberate fault injection, and database_pool_client_removed records pool cleanup. The existing test titled 'Transaction failure triggers balance rollback and creates no success ledger entry' submits an invalid amount, omits an explicit rejection-status assertion and searches for WITHDRAWAL although stored withdrawal type is WITHDRAW. It should not be the sole evidence of rollback; the separate trigger-injected ledger/audit tests provide that evidence. No application/test source fix was made in this report task.

The draft [Test Plan](../../STP.md) mentions bcrypt, SQLite, older Node requirements and additional browsers. The implemented system uses scrypt, PGlite for isolated fixtures, real PostgreSQL and Node >=22.12. Chromium was executed; Firefox/Edge, independent first-user acceptance, actual hosted TLS, backup/restore and sustained mixed-write load were not executed. SQL input/role checks are backend defenses; constraints/transactions/row locks are PostgreSQL protections. These automated results do not certify all Test Plan exit criteria or close every operational security risk.

See [copied test code](code/README.md), [code coverage](code-coverage-report.md) and [branch coverage](branch-coverage-report.md).
