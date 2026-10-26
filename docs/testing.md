# Testing and demonstration

Run from the repository root after `npm ci` and `npm run build`. All test data is fictional. DATABASE_URL is never used by automated tests.

## Test commands

| Command | What runs |
|---|---|
| `npm test` | Compiles actual C++; Node unit/API tests using new in-memory PGlite databases per fixture |
| `npm run test:postgres` | Compiles C++; temporary PostgreSQL cluster plus API suite, repeatable migrations, independent connection persistence, ten competing withdrawal/duplicate requests and 500 authenticated-session reads |
| `npm run test:e2e` | Playwright Chromium: customer/admin workflows, forms/auth errors, loading/API failure handling, mobile layout; isolated server on 127.0.0.1:4173 |
| `npm run lint` | ESLint JavaScript source checks |
| `npm run format:check` | Prettier check of authored JS/HTML/CSS/config files; original submitted documents excluded |
| `npm audit` | Dependency advisory scan |
| `npm run build` | C++17 optimized build with `-Wall -Wextra -Werror` |

There is no TypeScript or frontend bundler. Do not invent type-check/build tasks for this native JS/HTML app. Browser traces/screenshots on failure are written under ignored `test-results/`; Playwright can display retained traces using `npx playwright show-trace <trace.zip>`.

### Real PostgreSQL test isolation

The default test launcher uses the `embedded-postgres` development dependency, allocates a free loopback port, generates random database credentials and a unique directory under `build/postgres-test-*`, initializes a new cluster, and creates `bank_test_runtime`. It does not connect to or modify a system database. Every fixture creates a UUID-named schema, runs the actual migration with the `pg` driver, and drops only that generated schema on completion. Tests reject a TEST_DATABASE_URL whose database name does not start `bank_test_`. Never point even that variable at valuable/shared data. The generated cluster is stopped and kept for diagnostics in ignored build output; no reset of existing application data occurs.

On supported x64 Windows/Linux/macOS and supported ARM Linux/macOS, use `npm run test:postgres` directly (run as a normal OS user; PostgreSQL refuses root). On **ARM Windows**, the helper package cannot automatically select x64 binaries. Install a portable PostgreSQL distribution compatible with Windows emulation, or reproduce the binary setup used here:

```powershell
npm pack @embedded-postgres/windows-x64@18.4.0-beta.17 --pack-destination build --silent
New-Item -ItemType Directory -Force build/postgres-portable
tar -xzf build/embedded-postgres-windows-x64-18.4.0-beta.17.tgz -C build/postgres-portable
$env:POSTGRES_BIN = (Resolve-Path build/postgres-portable/package/native/bin).Path
npm run test:postgres
```

POSTGRES_BIN can also point to an existing installation's bin directory: the launcher still creates its own cluster/port. It invokes executables without a shell, hides process windows and does not install a service. Do not manually delete/move generated database directories while their server is running. A forcibly interrupted run may need `pg_ctl -D <exact generated cluster path> -m fast -w stop`; target only that run's path.

### Browser test data

The test server seeds administrator `test-admin` / `FictionalAdmin!2026` and customer `6000000000001` / `FictionalCustomer!2026` only in its disposable database. These are not production credentials and are not created by migrate/admin. The server binds loopback and terminates when Playwright completes. Port 4173 must be free. Install its browser with `npx playwright install chromium` first.

The main E2E scenario logs in as the customer, verifies ₹1,000, deposits ₹250.55, withdraws ₹50.55, rejects an overdraft, checks history/filtering and updates contact details. An independent admin context creates a second account, views details, searches, closes/settles the first, verifies the customer's session is invalid, views audit events and logs out. Cross-account access is tested through the customer's real cookie. Other browser cases exercise native form validation, password masking, generic authentication errors, loading/error/retry states and 390px mobile layout.

### Financial fault tests

The API suite installs a temporary PL/pgSQL trigger in an isolated schema which throws before a ledger insert. It then verifies HTTP failure, unchanged balance and unchanged ledger count. A separate injected engine failure verifies no financial mutation. These are intentional failures; generic structured `request_failed` server log entries are expected while these tests pass. Concurrent PGlite tests establish orchestration behavior only because its single connection is serialized; the PostgreSQL suite is the authority for multiconnection locking.

## Manual demonstration with the normal application

1. Follow README, provision your own admin, start PostgreSQL and `npm start`.
2. As admin, open a fictional account with ₹1,000 and a unique password. Note its generated account number.
3. Sign out; sign in as that customer. Verify balance, deposit ₹250.55, withdraw ₹50.55, verify ₹1,200 and both ledger entries.
4. Try withdrawing ₹1,200.01; verify clear failure and unchanged balance. Apply history filters and update contact details.
5. In another browser profile, sign in as admin; search by name/number and review details. An ordinary customer must not see admin navigation or access admin endpoints.
6. Sign out customer and submit three incorrect credentials. Confirm the correct credentials still fail; use admin Unlock and then sign in successfully.
7. As admin, close the account, confirming the exact number and fictional settlement authorization. Verify CLOSED/zero balance, SETTLEMENT ledger entry and denied customer access.
8. Restart only the application; the same PostgreSQL account and ledger must remain. Review Security activity.

Independent first-time-user usability acceptance, Firefox/Edge/Safari coverage, actual hosted HTTPS, sustained mixed-write load and disaster recovery drills remain evaluator/operator work. Local automated timing is not a production latency guarantee.

The 500-session test submits all 500 reads at once through a keepalive HTTP agent capped at 100 sockets; timing includes client queue time. An unpooled 500-socket burst encountered local Windows connection refusals. The test covers concurrently valid sessions and authenticated balance reads; it does not certify 500 new TCP handshakes at once. Latest measurements are in the implementation report.
