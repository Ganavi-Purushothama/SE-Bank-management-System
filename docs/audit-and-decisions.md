# Initial audit and implementation decisions

Audit date: 26 October 2026. Source: GitHub default branch `main`, commit `cb1212a`, cloned into `Jackfruit/SE-Bank-management-System`. The parent `Jackfruit` directory was not a Git repository; its Word/PDF/template files were left untouched. The implementation is on `implementation/bank-system`.

## What existed

The repository contained README, SRS, SAD, STP, an SRS PDF and UML component/use-case diagrams. There was no application code, database/schema, dependencies, environment configuration, test runner, deployment, or existing banking data. All application features were missing. No embedded credentials were found in the inspected text artifacts. Design artifacts do not establish implementation or security.

Reviewed the complete Markdown requirements/design/test plan, README, and XML of both UML diagrams. Their binary PDF/PNG versions were preserved; the implementation uses the editable Markdown/XML sources. The sequence diagrams referenced in SAD/STP are absent. The use-case diagram exists as `BMS_UseCase_Diagram.drawio`, not the older filename referenced by README. STP refers to SRS v2.0 and additional requirement IDs; the actual SRS is v1.1 and has F-001–020, NF-001–006, SR-001–005.

## Decisions and conflicts

| Question | Evidence | Implemented decision |
|---|---|---|
| Web/backend architecture | SRS describes a C++ web server and libpq; later SAD explicitly selects Express with stateless C++ rule checking | Follow the more detailed SAD layered architecture: browser → Express → C++ validation, with PostgreSQL I/O in Express. SRS's literal C++ routing/libpq and NF-005 split are architectural deviations, not claimed as satisfied. |
| SQL engine | SRS explicitly requires PostgreSQL; SAD allows SQLite locally | PostgreSQL is the supported application database. PGlite is test-only; no SQLite production substitute. |
| Registration | SRS F-001 and UML grant account opening to admin | No public registration. Admin provisions customers; login uses generated account number. |
| Lockout | F-009 says within a session; SR-003 requires persisted account lock and admin intervention | Stronger persisted three-failure account lock; deletes existing sessions; admin unlocks customer access. Errors stay generic. |
| Credentials | SRS allows PIN/password; SAD bcrypt or equivalent | Passwords of at least 12 characters (at most 128 bytes), Node's scrypt N=32768/r=8/p=1 with independent 128-bit salts and 64-byte hashes. No custom cryptography. |
| Currency/minimum | SRS requires configurable initial and retained minimum, specifies no figures/currency | Explicit application policy: INR, integer paise, default opening ₹500, retained minimum ₹0. Both configurable. Ceiling ₹90,000,000,000.00. No fees, interest, loans or transfers. |
| Closing/settling | F-005 requires closure with settled balance; no external payment integration | Admin confirms account number and fictional payout authorization. C++ approves full settlement; SQL atomically records SETTLEMENT, zeros balance, marks CLOSED, invalidates sessions and audits. No physical deletion or external payout. |
| Session/API examples | SAD examples use numeric amounts and ambiguous units | API decimal amounts are strings in rupees; IPC values and returned balances are integer paise. Preserve operation names and JSON approval/rejection model; explicit contract in API guide. |
| Statement export | SRS requires last N transactions, not file export | Paginated HTML mini-statement with date/type filters; downloadable statement is not required or claimed. |

## Implementation sequence and file plan

1. `migrations/001_initial.sql`, `server/db.js`, configuration and scripts: PostgreSQL foundation and non-destructive migration.
2. `core/banking.hpp`, `core/main.cpp`, `server/core.js`, `server/banking.js`: C++ IPC and atomic banking operations.
3. `server/auth.js`, `crypto.js`, `validation.js`, `app.js`: sessions, access controls, lockout and APIs.
4. `public/index.html`, `style.css`, `app.js`: responsive customer/admin UI connected to the API.
5. `tests/`, Playwright, lint/format configuration: rules, API, faults, real PostgreSQL and browser workflows.
6. README, `docs/`, CI: reproducible setup, requirements mapping, security and final report. Submitted SRS/SAD/STP/diagrams remain unchanged.

## Initial risks

No security or integrity controls existed because no runtime existed. Implementation priorities were credential hashing, authorization on every account route, transactional ledger consistency, concurrency protection, idempotency, safe IPC, session invalidation and honest deployment boundaries. There was no existing working tree to preserve beyond the submitted artifacts; the cloned checkout was clean before creating new files.
