# SCRUM-36 execution evidence

Execution date: 10 November 2026 (Asia/Calcutta).
Test source revision: `4cec83f` on `codex/scrum-36-unit-test-evidence`.
Subsequent commits add evidence and documentation only.

Environment: Windows, Node `v24.22.1` (`win32/x64`), npm `11.19.1`,
G++ `16.2.0` (MSYS2 Rev3). Dependencies were already installed; both test
commands rebuilt the actual C++ executable with C++17 and warnings as errors.

| Command | Exit code | Result | Captured output |
|---|---|---|---|
| `npm run test:unit` | 0 | 17 passed, 0 failed, 0 skipped | [unit-tests.txt](unit-tests.txt) |
| `npm test` | 0 | 34 passed, 0 failed, 1 skipped (35 discovered) | [regression-tests.txt](regression-tests.txt) |
| `npm run lint` | 0 | Passed | [lint.txt](lint.txt) |
| `npm run format:check` | 0 | Passed | [format-check.txt](format-check.txt) |
| `git diff --check` | 0 | Passed | No output on success |

These are captured command outputs, not illustrative examples. Timings and
generated request IDs vary on rerun. `request_failed` entries with `P0001` and
`INTERNAL` are expected in intentional rollback/engine-failure tests; their
assertions passed.

`test:unit` contains the 10 core/validation/hash tests in `core.test.js`, five
focused validation tests, one statement-period test and one CSV test. These tests
use no database or HTTP server. C++ rules are exercised through the real compiled
executable rather than a mocked rules engine.

`npm test` includes those same 17 tests plus API and statement integration tests.
Do not add the two pass counts together as unique tests. `TEST_DATABASE_URL` was
cleared for the captured run, so integration tests used disposable in-memory
PGlite fixtures. The one skipped integration test checks a real PostgreSQL
statement snapshot during a concurrent deposit; run `npm run test:postgres` for
that verification. There are no skipped unit tests.

An existing uncommitted edit to `migrations/001_initial.sql` adds blank lines
only. It was present during execution and is excluded from SCRUM-36 commits.
No application logic or database schema behavior changed for this issue.

Real PostgreSQL, browser E2E, dependency audit and remote CI were not rerun for
this issue. This evidence does not establish SCRUM-38 completion or a coverage
percentage. See [testing instructions](../../testing.md) for reproduction and
the [Jira evidence](../../scrum-36-jira-evidence.md) for acceptance mapping.
