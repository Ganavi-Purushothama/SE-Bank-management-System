# SCRUM-39 — Document Installation and Execution

Prepared 10 November 2026 (Asia/Calcutta). Ready for review against the four
criteria supplied in the Jira screenshot. Jira and GitHub have not been edited.

## Comment to paste into Jira

Documented installation and execution in `docs/setup-and-execution.md` and
corrected the README's obsolete branch and machine-specific folder path.

- Prerequisites and dependencies: Git, Node >=22.12/npm, C++17 G++, PostgreSQL,
  browser requirements, locked npm installation and optional browser downloads.
- Setup/execution commands: fresh checkout, dependency installation, build,
  provisioning, startup/shutdown, restart and a fictional banking demonstration.
- Database configuration: separate project-owned helper and manual PostgreSQL
  routes, role/database creation, environment settings, private credentials,
  port/origin matching and ordinary troubleshooting.
- Clean-copy verification: exported committed source without existing
  dependencies, environment, database or compiled binary. Fresh npm ci installed
  177 packages, C++ compilation passed, and all 26 PostgreSQL tests passed with
  zero failures/skips, including migration/admin/startup/restart persistence.
  Lint, formatting and whitespace checks also passed.

The existing OS tools and portable PostgreSQL binaries were reused. Test
entrypoints received generated isolated environment settings. A fresh OS,
interactive psql role creation, persistent helper startup and the manual browser
demo were not repeated. These limits are explicit in the execution record.

Evidence: `docs/evidence/scrum-39/`; review branch:
`codex/scrum-39-installation-execution` (local, not pushed).

## Acceptance mapping

| Jira criterion | Evidence |
|---|---|
| Prerequisites and dependencies are documented | [Guide prerequisites and dependency installation](setup-and-execution.md#prerequisites): required tools/versions, platform shell differences, npm ci and C++ build |
| Setup and execution commands are provided | Guide source/dependency setup, Route A/Route B, health check, startup/restart, demonstration and troubleshooting; [README](../README.md) links the full guide |
| Database configuration instructions are included | Route A project cluster and private login; Route B psql role/database commands, URL encoding, `.env`, provisioning and origin/port configuration |
| Instructions are tested on a clean setup where feasible | [Clean-copy record](evidence/scrum-39/README.md): fresh dependency installation/build and 26 real PostgreSQL checks including normal entrypoint provisioning/start/restart; reused OS tools and unexecuted manual steps explicitly listed |

## Attachments

- [Clean-copy execution record](evidence/scrum-39/README.md)
- [Dependency install output](evidence/scrum-39/install.txt)
- [C++ build output](evidence/scrum-39/build.txt)
- [Real PostgreSQL/startup output](evidence/scrum-39/postgres-tests.txt)
- [Lint](evidence/scrum-39/lint.txt) and [formatting](evidence/scrum-39/format-check.txt) outputs

Attach the files themselves to Jira; teammates cannot open your local paths.
No generated credentials, application database or copied `.env` is included.

## Pull request preparation

Suggested title: **SCRUM-39: Document and verify installation and execution**

The README previously pointed to another machine's absolute directory and an
older branch. The update provides portable checkout/setup instructions and a
full guide covering prerequisites, locked dependency installation, database
roles/configuration, helper/manual startup, restart, demo and troubleshooting.

Validation: exported committed source to a separate clean directory, installed
177 packages with npm ci, compiled C++ successfully, and passed 26 PostgreSQL
checks with no failures/skips, including provisioning, startup and persistence
after restart. Lint, formatting and whitespace checks passed. Reused OS tools
and portable PostgreSQL; manual helper/psql/browser walkthroughs are not claimed.
No application code, schema behavior or dependencies changed.

Branch starts at SCRUM-38 revision `0ddfd8d`. If PR #21 is still unmerged,
target `codex/scrum-38-security-integrity`; once dependencies merge, inspect the
diff against main and update the target as appropriate. Remote CI has not been
verified for this branch. The user's unrelated SQL edit remains uncommitted.

## Five-commit delivery

| Commit | Change |
|---|---|
| `9a613b0` | Prerequisites and clean checkout/dependency instructions |
| `3d55afc` | Helper/manual database configuration and startup routes |
| `ba00a9b` | Portable README, execution/demo and troubleshooting |
| `110376c` | Captured clean-copy installation, build and startup evidence |
| This document's commit: `docs(SCRUM-39): prepare acceptance evidence and review handoff` | Jira/PR handoff, traceability and report updates |
