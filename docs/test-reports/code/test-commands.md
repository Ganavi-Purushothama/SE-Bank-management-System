# Commands used for test reports

Run from a complete checkout of `729f5c35e3aba21da91585636fd6fea87bcc6e43`. To preserve your application binary/configuration, use a separate copy inside the project's ignored build directory, as this collection did. Dependencies may resolve from the parent checkout; OS tools must already exist. The report destination below is the original checkout's docs/test-reports/evidence directory. No normal DATABASE_URL is loaded by these commands.

## Instrumented C++ build

```bash
g++ -std=c++17 -O0 --coverage -fprofile-abs-path -Wall -Wextra -Werror core/main.cpp -o build/bank-core.exe
```

## Unit selection

```bash
unset TEST_DATABASE_URL
node --test --test-concurrency=1 tests/core.test.js tests/validation.test.js tests/statement-period.test.js tests/statement-csv.test.js
```

## JavaScript coverage with PGlite

```bash
node --test --experimental-test-coverage --test-coverage-include='server/*.js' --test-coverage-include='public/statement-csv.js' --test-concurrency=1 tests/core.test.js tests/validation.test.js tests/api.test.js tests/security.test.js tests/integrity.test.js tests/statement-period.test.js tests/statement-csv.test.js tests/statements.test.js
```

## JavaScript coverage with real PostgreSQL

Copy the archived coverage launcher to build/test-postgres.coverage.mjs in the full checkout. It is the original launcher plus Node coverage flags; do not replace the application's original launcher.

```bash
export POSTGRES_BIN='/absolute/path/to/postgres/bin'
node build/test-postgres.coverage.mjs
```

## C++ line and branch data

After all instrumented engine processes have exited:

```bash
gcov -b -c -j build/bank-core-main.gcda
```

Read bank-core-main.gcov.json.gz with a gzip/JSON reader. Keep only core/main.cpp and core/banking.hpp; sum executable line counts and count>0 lines, then sum branch records and count>0 edges. Project-only records are saved as evidence/cpp-gcov.json. Ignore standard-library files. Build afresh for a new measurement so old gcda counters are not mixed with another source revision.

## Browser validation

From the complete checkout, with its normal database-independent Playwright test server:

```bash
export PLAYWRIGHT_BROWSERS_PATH='/absolute/path/to/existing/playwright-browsers'
npm run test:e2e
```

On a fresh installation, use npx playwright install chromium instead of pointing at existing binaries. The collector used PowerShell Tee-Object to capture output and cleared TEST_DATABASE_URL before database-independent tests. Runtime test data is fictional; PostgreSQL's generated cluster is stopped by the launcher. These commands can generate build/test output but do not edit application source. Both PostgreSQL and browser child-process cleanup require normal process-launch permissions.

Versions: Node 24.22.1, npm 11.19.1, G++/gcov 16.2.0, PostgreSQL 18.4, Playwright 1.64.1. Measured runs all exited 0. Before publication, npm run lint and npm run format:check also passed with the report/code folder present. No fresh dependency audit was run for these four reports.
