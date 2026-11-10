# SCRUM-38 — Validate Security and Data Integrity

Prepared 10 November 2026 (Asia/Calcutta). All four supplied acceptance criteria
have local automated evidence. Ready for team review; Jira has not been changed.

## Comment to paste into Jira

Validated security and data integrity against disposable databases and the
isolated browser application. Added four regression tests covering denied
administrator actions, session-cookie rotation and replay, unchanged financial
records after invalid transactions, and audit-failure rollback with safe retry.

Results on 10 November 2026:

- `npm test`: 38 passed, 0 failed, 1 skipped.
- `npm run test:postgres`: 26 passed, 0 failed, 0 skipped.
- `npm run test:e2e`: 4 passed.
- `npm audit --json`: 0 reported vulnerabilities.
- Lint, formatting and whitespace checks passed.

Authentication, role/ownership checks, CSRF, lockout, session expiry/logout,
invalid amounts, overdraft, duplicate/conflicting requests, rollback and
concurrent writes have passing checks. The single default-suite skip is a
PostgreSQL-only concurrent statement-snapshot test, which passed in the real
PostgreSQL run. Suite counts overlap and must not be added as unique tests.

No critical application defect was identified in the executed checks; no
application logic change was required. Findings and remaining operational risks
are recorded in `docs/security.md`. Captured output and reproduction details
are in `docs/evidence/scrum-38/`. This is local academic-project verification,
not an independent penetration test or production certification.

Review branch: `codex/scrum-38-security-integrity` (local, not pushed).

## Acceptance mapping

| Acceptance criterion from Jira | Evidence |
|---|---|
| Authentication and authorization checks are tested | [Security tests](../tests/security.test.js): denied anonymous/forged/customer admin requests; old cookie rejected after sign-in rotation. [Existing API tests](../tests/api.test.js): ownership, roles, CSRF/origin, lockout, expiry, logout and closure invalidation. |
| Invalid transactions are rejected | [Integrity tests](../tests/integrity.test.js): malformed/negative/zero/overprecision/oversized amounts, overdraft and conflicting keys return 400/422/409 and preserve stored state. |
| Balance and transaction records remain consistent | Integrity tests compare balance with signed ledger net, snapshot balance/ledger/audit after rejection and injected audit failure, and verify same-key retry creates exactly one transaction. [PostgreSQL tests](../tests/postgres.test.js) verify actual locks, concurrent duplicates/withdrawals and second-connection persistence. Existing SQL/engine fault tests passed too. |
| Findings are recorded and critical defects are addressed | [Dated findings](security.md#scrum-38-validation-findings--10-november-2026): no critical defect found by the executed checks; advisory scan reports zero. Known residual risks remain explicitly recorded. Environment-related execution failures were resolved by successful reruns. |

## Files to attach

- [Execution record and reproduction steps](evidence/scrum-38/README.md)
- [PostgreSQL results](evidence/scrum-38/postgres-tests.txt)
- [Regression results](evidence/scrum-38/regression-tests.txt)
- [Browser results](evidence/scrum-38/browser-tests.txt)
- [Dependency audit](evidence/scrum-38/dependency-audit.json)
- [Lint output](evidence/scrum-38/lint.txt) and [formatting output](evidence/scrum-38/format-check.txt)

Upload files themselves rather than local filesystem links. Fault-test log
entries are expected and their assertions passed. No real customer data was used.

## Pull request preparation

Suggested title: **SCRUM-38: Validate security and financial data integrity**

The change adds four integration tests to both PGlite and PostgreSQL execution:
administrator-route denial, session rotation/replay rejection, unchanged
balance/ledger/audit records on rejected financial requests, and atomic rollback
when the audit insert fails. A same-key retry after recovery commits once.
It also records actual execution outputs, dated findings and acceptance mapping.

Validation: 38 default-suite passes (one PostgreSQL-only skip), 26 PostgreSQL
passes (no skips), 4 browser passes, no reported dependency advisories, and clean
lint/format/whitespace checks. Counts overlap. No application logic, dependency
or schema behavior changed. The unrelated SQL edit remains excluded.

This branch starts at SCRUM-36 revision `2271287`. While PR #20 is unmerged,
target `codex/scrum-36-unit-test-evidence` so the review shows only SCRUM-38
commits. If it has merged, check the diff against the merged target first.
Do not merge dependent PRs out of order. Remote CI is not claimed by local results.

## Commit record

| Commit | Change |
|---|---|
| `2eb6898` | Administrator-action denial and session replay tests |
| `46da49f` | Ledger reconciliation, invalid-transaction and audit-rollback tests |
| `8d8ce24` | Captured PostgreSQL/browser/regression/audit outputs |
| `f32d57f` | Dated findings and updated test-result documentation |
| This document's commit: `docs(SCRUM-38): prepare Jira evidence and pull request handoff` | Jira comment, attachments, acceptance mapping and PR handoff |
