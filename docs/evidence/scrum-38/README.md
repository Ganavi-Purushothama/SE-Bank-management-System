# SCRUM-38 execution record

Executed 10 November 2026 (Asia/Calcutta). Test source revision: `46da49f` on
`codex/scrum-38-security-integrity`, based on SCRUM-36 revision `2271287`.
Later commits add documentation/evidence only.

Environment: Windows, Node 24.22.1 (win32/x64), npm 11.19.1, G++ 16.2.0,
portable PostgreSQL 18.4, Playwright 1.64.1 / Chromium. Existing installed
dependencies and browser binaries were used. No dependency upgrade was made.

| Command | Exit | Actual result | Output |
|---|---|---|---|
| `npm test` | 0 | 38 passed, 0 failed, 1 skipped; 39 discovered | [regression-tests.txt](regression-tests.txt) |
| `npm run test:postgres` | 0 | 26 passed, 0 failed, 0 skipped | [postgres-tests.txt](postgres-tests.txt) |
| `npm run test:e2e` | 0 | 4 passed | [browser-tests.txt](browser-tests.txt) |
| `npm audit --json` | 0 | 0 reported vulnerabilities, including high/critical | [dependency-audit.json](dependency-audit.json) |
| `npm run lint` | 0 | Passed | [lint.txt](lint.txt) |
| `npm run format:check` | 0 | Passed | [format-check.txt](format-check.txt) |
| `git diff --check 2271287` | 0 | Passed | No output on success |

Reproduction from the repository root (Node >=22.12, npm dependencies, G++ and
the browser installed):

```powershell
Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
npm test
# Use this only if these portable binaries exist; otherwise use your PostgreSQL bin directory.
$env:POSTGRES_BIN = (Resolve-Path build/postgres-portable/package/native/bin).Path
npm run test:postgres
# Use this only for the project's existing browser installation.
$env:PLAYWRIGHT_BROWSERS_PATH = (Resolve-Path build/playwright-browsers).Path
npm run test:e2e
npm audit --json
npm run lint
npm run format:check
git diff --check 2271287
```

On a fresh machine use `npm ci` and `npx playwright install chromium`, then omit
PLAYWRIGHT_BROWSERS_PATH if using Playwright's default browser location. See the
[testing guide](../../testing.md) for PostgreSQL setup on other platforms.

The default regression run used isolated PGlite fixtures. Its one skipped test
is the real PostgreSQL concurrent statement-snapshot check; it passed in the
PostgreSQL run. Suites overlap and their counts are not additive. The 17-test
unit command was not separately rerun; its tests are included in `npm test`.

The PostgreSQL launcher generated a temporary cluster, random credentials, port
and per-fixture schemas, and stopped that cluster on completion. It did not use
the application DATABASE_URL. Browser tests used their own loopback-only server
and fictional PGlite data. No normal application data was changed.

Initial restricted-environment attempts could not initialize PostgreSQL, query
the npm advisory endpoint, or finish browser-process cleanup. Reruns with the
required process/network access completed with exit 0. The initial stalled
browser-test process tree was stopped before rerunning; captured files show the
completed runs. No application defect was inferred from these environment issues.

Captured outputs retain actual results; trailing blank lines were trimmed for
Git whitespace checks. Request IDs and durations vary on rerun. `request_failed`
entries are expected for injected SQL/engine failures. `database_pool_client_removed`
messages reflect pool cleanup and are not failed assertions.

The PostgreSQL 500-session read check measured total 504 ms and p95 214 ms over
100 pooled HTTP sockets. This is a local read workload, not a sustained-write or
public-hosting guarantee. No code coverage percentage or remote CI result is claimed.
The pre-existing six blank-line additions in `migrations/001_initial.sql` were
present during execution, remain untouched, and are excluded from these commits.
