# SCRUM-36 — Implement Unit Tests

Prepared 10 November 2026 (Asia/Calcutta). Implementation and local verification
are complete for the four acceptance criteria shown in the supplied Jira
screenshot. Ready for team review; Jira has not been changed.

## Comment to paste into Jira

Implemented and verified unit tests for core banking components.

- Core operations: opening accounts, deposits, withdrawals and settlement use the
  real compiled C++ engine, with exact balance assertions in integer paise.
- Valid and invalid inputs: decimal amounts, customer details, passwords,
  phone numbers, pagination and engine arguments are covered.
- Boundaries: exact opening minimum/maximum, one-paise differences, withdrawal
  to zero/minimum, overflow, and UTF-8 password byte limits are covered.
- Reproducibility: added `npm run test:unit`, documented prerequisites and
  commands, and saved actual execution output and environment details.

Verified on 10 November 2026:

| Command | Result |
|---|---|
| `npm run test:unit` | 17 passed, 0 failed, 0 skipped |
| `npm test` | 34 passed, 0 failed, 1 skipped (35 discovered) |
| `npm run lint` | Passed |
| `npm run format:check` | Passed |
| `git diff --check` | Passed |

All four SCRUM-36 acceptance criteria have supporting evidence. The regression
suite includes the unit tests, so counts overlap. The single skipped test is a
real PostgreSQL concurrent statement-snapshot integration case, executed through
`npm run test:postgres`; no unit tests were skipped. PostgreSQL and browser
checks were not rerun for this issue. No code coverage percentage is claimed.

Review branch: `codex/scrum-36-unit-test-evidence` (local; not pushed).
Evidence: `docs/evidence/scrum-36/`, with acceptance mapping in
`docs/traceability.md` and updated results in `docs/implementation-report.md`.

## Acceptance evidence for review

| Jira acceptance criterion | Evidence and observed result |
|---|---|
| Core banking functions have appropriate unit tests | [Core tests](../tests/core.test.js): opening, deposit, withdrawal, settlement; accepted operations assert exact balances. [Validation tests](../tests/validation.test.js) cover independently callable input checks. |
| Valid and invalid inputs are tested | Core tests reject unsupported operations, malformed IPC and invalid monetary arguments. Validation tests cover valid and invalid amounts, customer text, phone numbers, passwords and pagination. Existing [period](../tests/statement-period.test.js) and [CSV](../tests/statement-csv.test.js) tests run in the unit suite. |
| Boundary conditions are included | Opening at the minimum and one paise below; deposits reaching the exact maximum and overflow rejection; withdrawals reaching zero/minimum and rejecting one paise beyond; minimum/maximum password bytes and phone digits. |
| Test results are reproducible and documented | [Execution record](evidence/scrum-36/README.md) identifies tested source revision, tool versions, commands, exit codes and captured output. [Testing guide](testing.md) provides reproduction steps. |

## Attachments to add to Jira

Attach this document and the following captured outputs (all are repository
files, with fictional isolated test data):

- [Unit execution output](evidence/scrum-36/unit-tests.txt)
- [Regression execution output](evidence/scrum-36/regression-tests.txt)
- [Lint output](evidence/scrum-36/lint.txt)
- [Formatting output](evidence/scrum-36/format-check.txt)
- [Environment and execution record](evidence/scrum-36/README.md)

Expected `request_failed` entries in the regression output come from deliberate
database/engine failure injection; both tests assert unchanged financial state
and pass. PGlite serializes transactions; multiconnection PostgreSQL locking is
outside this issue's executed checks and belongs to SCRUM-38 validation.

## Five-commit delivery

| Commit | Change |
|---|---|
| `0dd79bd` | Banking rule boundaries and exact-paise regression tests |
| `4cec83f` | Focused validation tests and dedicated unit-test command |
| `c983ca0` | Captured execution outputs and environment record |
| `fd0be2e` | Updated README, test results, testing guide and acceptance mapping |
| This document's commit: `docs(SCRUM-36): prepare Jira acceptance evidence and review handoff` | Jira comment, acceptance evidence and attachment checklist |

The existing `migrations/001_initial.sql` edit is excluded from all five commits.
Application logic and schema behavior are unchanged. Uploading evidence,
changing Jira status, publishing the branch and remote CI are not claimed here.
