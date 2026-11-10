# Four-member preparation sheets

The assignments here follow the existing GitHub issues and submitted STP roles. They are a **responsibility and learning map**, not fabricated authorship. The implementation commits in merged PR #13 are recorded under Ganavi's Git account. Each member should use their own account for genuine review/testing evidence and understand the work they present.

Everyone: read the first two sections of [team-handoff.md](team-handoff.md), your sheet below, the shared request-flow/viva sections, and the [evaluation checklist](sprint1-evaluation.md). Do not memorize a claim you cannot demonstrate.

## Ganavi Purushothama — UI, integration, coordination and delivery

**GitHub:** `Ganavi-Purushothama`. Existing issues: #3 documentation/delivery, #10 UI, #11 integration/admin, co-assignee #2 architecture and #1 requirements. **STP:** QA Lead; coordinate test plan and execution. This does not make you the only tester.

### Know these files and functions

| Area | What you must be able to point to |
|---|---|
| HTML/CSS | `public/index.html`: root/dialog/status regions; `public/style.css`: layout, forms, responsive breakpoint/focus states |
| Client/API connection | `public/app.js`: `api`, `renderLogin`, `frame`, `customer`, `transaction`, `admin`, `closeAccount`, `render` |
| Reuse/safety | `escape`, `money`, `details`, `historyTable`, `pagination`, `busy`, `formError`, `notice` |
| Integration boundary | `server/app.js` endpoint matching; browser sends decimal strings/cookie/CSRF/retry key, server returns authoritative result |
| Reproducibility | Root README, `package.json`, `scripts/local.mjs`, `.gitignore`, `.github/workflows/ci.yml` |
| Evaluation | Submitted SRS/SAD/STP, `docs/traceability.md`, this kit and actual PR/Actions evidence |

### Explain your area

The frontend uses native HTML, CSS and JavaScript, not React. It renders different navigation based on server-reported role, but the backend independently enforces that role. A financial form first validates syntax and asks for confirmation; it then sends the request and waits for the database-backed response. Buttons are disabled during submission. Network/validation errors are shown clearly, and the UI refreshes balance/history after commitment. Templates escape customer text to prevent stored data becoming executable markup.

The local helper removes the need to know another installed PostgreSQL service's password. It creates a project-owned loopback cluster on port 55432 and preserves data between starts. It stores local credentials in ignored `data/`, backs up `.env`, builds C++ and starts the normal app. The HTTP app still runs on localhost:3000. This is development convenience, not public hosting.

### Rehearse tonight

1. Run `npm run local`; sign in from the local credential file without projecting that file.
2. Open an account with fictional details/₹1,000; save its generated account number privately.
3. Sign in as customer, show overview, deposit/withdraw confirmation, history, profile, empty/validation/error states.
4. Show separate admin navigation and explain the server role guard.
5. Open PR #13 and the successful Actions run. Know that its review list was empty at preparation; coordinate real reviews rather than claiming they already happened.
6. Play the committed video all the way through; keep an offline copy and confirm all four members will attend.

### 30-second explanation

“My backlog responsibilities are the interface, integration and project delivery. The frontend calls the Express API rather than generating local transaction results. We use labeled forms, review dialogs and clear loading/error states. After a successful committed transaction we refresh account data. Customer and administrator navigation differ, while authorization is enforced again on the server. I coordinate the requirements mapping, reproducible startup, GitHub evidence and demonstration.”

### Likely questions

- **Why no registration link?** SRS F-001 assigns account creation to an administrator.
- **Can hidden admin buttons secure the app?** No; `authentication.admin` protects server endpoints.
- **What handles API failure?** `api` raises a useful error; form/view handlers show inline or retry UI; an expired session returns to login.
- **Why is the data folder missing on GitHub?** It contains local database files and passwords, not source deliverables.
- **Did each person author their assigned code?** Show actual history and distinguish coding-agent-assisted commits from assigned ownership, reviews and testing.

**Cross-check:** have Divyanshi independently test your UI; you verify their reported evidence and fix actual findings. Do not approve your own PR.

## Devopam Pal — database/backend foundation and C++ financial core

**GitHub:** `DEV-2828`. Existing issues: #4 database/backend (Sprint-1), #5 core transactions (no milestone), #6 core tests (Sprint-2), co-assignee #1 requirements. **STP:** Core Engine Test Engineer.

### Know these files and functions

| Area | What you must be able to point to |
|---|---|
| C++ | `core/banking.hpp`: `bank::evaluate`; `core/main.cpp`: canonical JSON input, bounded read, `stoll`, approval/rejection output |
| IPC | `server/core.js`: spawn with no shell, integer contract, timeout/output bound, response checks |
| Persistence | `server/db.js`: pool, `transaction`, `migrate`; `migrations/001_initial.sql`: keys/constraints/indexes/relations |
| Orchestration | `server/banking.js`: `create`, `change`, `close`; lock → core decision → balance/ledger → commit |
| Money | `server/validation.js`: amount parsing into integer paise; config minimum/ceiling policy |
| Tooling/tests | `scripts/build.mjs`, `scripts/test-postgres.mjs`, `tests/core.test.js`, `tests/postgres.test.js` |

### Explain your area

Express obtains the current balance from PostgreSQL, never from the browser. It selects the account `FOR UPDATE` inside a transaction. That lock is held while C++ checks the proposed operation. If approved, the server updates balance and inserts the ledger on the same connection, then commits. If anything fails, rollback undoes all financial writes. C++ is a pure decision component: no account lookup, login or SQL code lives there under the SAD design.

All money is integer paise. `"250.55"` becomes 25,055; the resulting balance is an integer, stored as PostgreSQL BIGINT and C++ int64. The UI only formats it. The strict stdin field order is a documented IPC interface, not arbitrary JSON parsing. OPENING uses initial minimum; WITHDRAW uses retained minimum; SETTLEMENT intentionally permits the full balance to become zero on authorized closure.

### Worked example to explain without notes

1. Opening ₹1,000 = 100,000 paise.
2. Deposit ₹250.55 = 25,055; C++ approves 125,055 paise.
3. Withdraw ₹50.55 = 5,055; C++ approves 120,000 paise = ₹1,200.
4. Withdraw ₹1,200.01 = 120,001; reject because it exceeds the current 120,000. No financial writes commit.
5. Two competing ₹800 withdrawals from ₹1,200 cannot both succeed: the second waits for the locked account and evaluates the updated balance.
6. Repeating the *same intended request* with the same retry key produces one ledger entry; a different key represents a different intended request and still needs balance checks.

### Rehearse tonight

Run `npm test` and inspect the core cases. Run `npm run test:postgres` when binaries are configured; on this machine set POSTGRES_BIN as described in `docs/testing.md`. Read the ledger-failure trigger test: it deliberately throws during insert and proves the earlier balance update rolls back. Show unique/foreign/check constraints in the SQL. Explain schema versioning and why migrations are repeatable, not a “delete and recreate” reset.

### 30-second explanation

“My assigned areas are the database foundation and banking core. We represent money as integer paise and evaluate deposit/withdrawal rules in C++. Express invokes that executable through bounded JSON IPC. PostgreSQL holds the authoritative account, locks it for financial changes, and commits the balance and ledger together. Concurrent withdrawals therefore evaluate the latest committed balance. Tests cover invalid amounts, minimum/maximum bounds, duplicate requests, real row locking and rollback after an injected database failure.”

### Likely questions

- **Why not use doubles?** Binary floating-point can misrepresent decimal money; integer paise is exact within defined bounds.
- **Does Node being single-threaded prevent overdrafts?** No. Async requests and multiple connections/processes require database concurrency controls.
- **What if the engine crashes?** Reject and rollback; no JavaScript rule fallback silently approves it.
- **Why keep account history after closure?** Financial/audit records must remain; CLOSED enforces zero balance.
- **Are you using libpq?** No. Express uses `pg`; C++ performs rules. This follows the later SAD and the SRS discrepancy is documented.

**Cross-check:** review API authorization/error expectations with Deepthi and validate the guide/video arithmetic, rather than only reviewing your own planned area.

## Deepthi V — authentication, account lifecycle and backend APIs

**GitHub:** `DeepthiVenkatesh2006`. Existing issues: #7 authentication/security and #8 account management (Sprint-1), #9 history/statements (Sprint-2). **STP:** Backend/API Test Engineer.

### Know these files and functions

| Area | What you must be able to point to |
|---|---|
| Authentication | `server/auth.js`: `login`, `required`, `admin`, `logout` |
| Credentials/tokens | `server/crypto.js`: `hashPassword`, `verifyPassword`, `token`, `digest` |
| Validation/errors | `server/validation.js`, `errors.js`, request guards/error handler in `app.js` |
| Lifecycle | `server/banking.js`: `accessible`, `create`, `update`, `close`, `audit` |
| Routes | `server/app.js`: auth, account, history and admin endpoints |
| Data | users, sessions, accounts, audit_events and transactions table relationships |
| Tests/reference | `tests/api.test.js`, `docs/api.md`, `docs/security.md` |

### Explain your area

Authentication establishes who the user is; authorization decides which resources/actions that identity may access. The login identifier is the generated account number for a customer and a configured admin login for an administrator. A session's role and account ownership are checked on the server; changing an account UUID in a request does not grant access.

Passwords are salted scrypt hashes, not plaintext/encrypted passwords. A random bearer token goes in an HttpOnly cookie; only its digest is stored in SQL. A separate random CSRF token and exact Origin protect writes. SameSite=Strict is an additional cookie control. Sessions have an absolute expiry and are removed on logout; lockout and closure invalidate all that customer's sessions.

Three failed logins persistently lock access until an administrator unlocks it. Generic errors do not reveal whether a login exists or is locked. ACTIVE/CLOSED is account state; `users.locked` is a separate access-lock flag. An account can be ACTIVE but temporarily inaccessible because it is locked.

### Account lifecycle to demonstrate

Admin opens a customer with name/password/initial deposit. The server generates the account number and hashes credentials. Customer can view their own data and update name/phone/address, not balance/role/owner. Admin searches/accounts details and unlocks access. Closure requires exact account-number confirmation, records the locked current balance as a fictional SETTLEMENT, zeros/closes the account and invalidates sessions. No external payout or hard delete happens.

History is authorized against the same account and uses validated type/date/page filters, parameterized SQL and 20-row pages. It belongs to Sprint-2 issue #9 in the actual milestone, even though it is already connected in the demo. Do not claim a PDF exporter exists.

### Rehearse tonight

Use fictional data only. Verify wrong credentials, three failures, admin unlock and successful re-login. Compare customer and administrator endpoint access. Verify logout makes `/api/me` return 401. Read the cross-account test which expects 404. Try adding an unauthorized `balance` field to a profile update and explain why it is rejected. Review core IPC with Devopam so you can explain the API-to-core boundary.

### 30-second explanation

“My backlog responsibility covers authentication, account management and statements. We hash passwords with scrypt, persist expiring sessions and invalidate them on logout, lockout or closure. Every account endpoint checks ownership and every admin endpoint checks role. Three failed logins require an administrator unlock. Account opening and closure follow the SRS's administrator workflow, with input validation and retained ledger/audit records. API tests exercise valid flows, unauthorized access, malformed inputs and state transitions.”

### Likely questions

- **401 versus 403?** 401 means no valid authentication; 403 means authenticated/request context lacks permission or a required security token/origin.
- **Why 404 for another account?** Do not expose existence or details to an unauthorized customer.
- **Why a CSRF token if passwords are hashed?** They solve unrelated problems: stolen request intent versus stored credential exposure.
- **What is a session fixation defense here?** Successful login creates a fresh random session and removes the previously presented one.
- **What is not covered?** No MFA/reset UI, no independent security certification; in-memory IP limiting and permanent-lockout tradeoffs are documented.

**Cross-check:** independently review C++/database rejection-to-HTTP behavior and the evaluation recording's privacy, not just your assigned auth text.

## Divyanshi Verma — architecture co-ownership and independent frontend/database QA

**GitHub:** `divyanshi-verma-25`. Existing issues: co-assignee #2 architecture (Sprint-1); #12 integration/security/regression testing (Sprint-2). **STP:** Frontend/DB Test Engineer, UI end-to-end/persistence/security checks. There is no invented separate Sprint-1 implementation issue assigned to you in the tracker; explain architecture and genuine independent validation contributions accurately.

### Know these files and functions

| Area | What you must be able to point to |
|---|---|
| Architecture | SAD, component/use-case UML, `docs/audit-and-decisions.md`, request-flow/traceability guides |
| Browser verification | `tests/browser/workflow.spec.js`, `tests/browser-server.js`, `playwright.config.js` |
| Isolation | `tests/fixture.js`: disposable PGlite vs real PostgreSQL schema setup |
| Database evidence | `tests/postgres.test.js`, `tests/startup.test.js`, ledger-failure case in API tests |
| CI | `.github/workflows/ci.yml` and actual Actions job logs |
| Evaluation media | Demo WebM, timeline, `scripts/record-sprint-demo.mjs` and playback/privacy checks |

### Explain your area

The architecture keeps presentation, HTTP/auth, financial rules and persistence separate. Your testing role checks that those boundaries actually work together. A green C++ calculation does not prove the database committed; a working UI does not prove cross-account isolation; a single PGlite connection does not prove real row-lock concurrency. The suites deliberately test those different levels.

Unit/API suite: 19 tests on disposable PGlite with the real C++ executable. Real PostgreSQL suite: 18 tests through `pg`, including lock contention, idempotent retries, injected ledger failure, migration repeatability and restart persistence. Browser suite: 3 workflows, including real banking/admin flows, masked/form behavior, stored XSS as text, loading/error/retry and 390px overflow checks. These counts include repeated API coverage across runtimes, not a coverage percentage.

The load test holds 500 fictional customer sessions and submits 500 reads over 100 keepalive HTTP connections. Give that exact workload. An unrestricted 500-socket burst encountered local refusals and is documented; do not omit it or claim production capacity. The demo uses actual PostgreSQL in a temporary isolated schema, not modified live customer records.

### Rehearse tonight

1. Independently run login → dashboard → deposit → withdrawal → rejected overdraft → history → logout.
2. Compare expected and actual balances and ledger counts. A failed transaction must not add a success entry.
3. Run available suites and record the actual results from your machine; note missing compiler/browser/PG dependencies as unavailable, not passed.
4. Show a successful main Actions run and expand the test steps.
5. Play all 60 seconds of the video; check captions, readable values, no visible credentials and no real user data.
6. Review the handoff against actual issue milestones and original documents; report any discrepancy genuinely.

### 30-second explanation

“I co-own the architecture issue and my Test Plan role is frontend/database verification. I check the complete user workflow and persistence rather than assuming unit tests establish integration. We separately test the actual C++ executable, API security and rollback, true PostgreSQL concurrency/restart, and Chromium UI behavior. Our Actions workflow repeats those checks on GitHub. We document limits such as untested browsers, pending independent usability acceptance and local rather than public hosting.”

### Likely questions

- **What is regression testing?** Rerunning established checks after changes to detect previously working behavior breaking.
- **Why two DB runtimes?** PGlite gives isolated fast fixtures; actual PostgreSQL establishes multiconnection/driver/deployment-entrypoint behavior.
- **How do you test rollback?** Inject a trigger failure before ledger insertion and assert unchanged persisted balance/history afterward.
- **Is a screenshot enough?** No. It is visual evidence; tests also verify API status, balance, ledger, authorization and persistence.
- **What still needs people?** Genuine reviews, assignee acceptance/issue updates, independent first-time-user acceptance and attendance cannot be fabricated by a script.

**Cross-check:** review Ganavi's UI/integration and the whole kit, while Deepthi/Devopam review your reported test reasoning.

## Shared final rehearsal — ask each other these five questions

1. Where is the authoritative balance, and what exact path changes it?
2. What happens if two withdrawals arrive together or the same request is retried?
3. Which checks stop a customer reading another customer's account?
4. Which GitHub evidence is already recorded, and which review/acceptance evidence is still missing?
5. Which statement about your assigned work is supported by actual commits, tests or reviews, rather than just a role assignment?

If anyone cannot answer one, use the code/handoff together before tomorrow. The goal is a team that can explain and maintain the submitted system, not four memorized scripts.
