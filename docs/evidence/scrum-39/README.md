# SCRUM-39 clean-copy execution record

Executed 10 November 2026 (Asia/Calcutta). Source revision: `ba00a9b` on
`codex/scrum-39-installation-execution`, based on SCRUM-38 revision `0ddfd8d`.
Later commits add verification documentation/evidence only.

## Isolation and prerequisites

Exported tracked source with `git archive HEAD` and extracted it into the new
ignored directory `build/scrum39-clean-20261110`. Before installation, this copy
had no `.env`, `node_modules`, `data` or compiled engine. No Git metadata, normal
application secrets, ignored database state or existing dependencies were copied.
The unrelated working-tree SQL blank-line edit was not included in the archive.

Reused OS tools: Windows, Node 24.22.1 (win32/x64), npm 11.19.1, G++ 16.2.0,
portable PostgreSQL 18.4. PostgreSQL binaries were selected explicitly using
POSTGRES_BIN from the original checkout's ignored portable distribution; the
database cluster and schemas were freshly generated inside the clean copy.
This is a clean source/dependency/database setup on an existing OS, not a fresh VM.

## Commands and observed results

Commands ran from the clean copy unless stated otherwise. All listed commands
exited 0. Captured output is linked below; trailing blank lines were trimmed.

| Command | Result | Output |
|---|---|---|
| `npm ci --cache build/npm-cache --no-audit --no-fund` | 177 locked packages installed into fresh node_modules | [install.txt](install.txt) |
| `Copy-Item .env.example .env` | Created a new configuration template; no existing environment file overwritten | No command output |
| `npm run build` | Fresh C++17 engine compiled successfully | [build.txt](build.txt) |
| `npm run test:postgres` | 26 passed, 0 failed, 0 skipped | [postgres-tests.txt](postgres-tests.txt) |
| `npm run lint` | Passed | [lint.txt](lint.txt) |
| `npm run format:check` | Passed | [format-check.txt](format-check.txt) |

`TEST_DATABASE_URL` was cleared before the launcher. POSTGRES_BIN selected the
existing portable binaries. The launcher created its own cluster/port/random
credentials and test schemas and stopped that cluster when finished. It did not
use the copied placeholder DATABASE_URL or connect to the normal application's
database. Tests inject their own environment settings into normal entrypoints.

The startup test in `tests/startup.test.js` runs migration twice, provisions an
admin, starts `server/index.js`, checks health, signs in, creates a fictional
account, restarts the server, then verifies the persisted session/account/ledger.
It invokes the files used by `npm run migrate`, `npm run admin` and `npm start`
directly with generated environment variables. npm aliases were checked against
package.json; the interactive psql role/password commands were not executed here.

The original and clean-copy package-lock.json SHA-256 hashes matched after npm ci:
`F612562273CB2B246FB2C8ECA47AE16490D42D93E09D0E15D4278A4ADC536994`.
No lockfile or application code change was needed.

## Findings and practical limits

- Corrected the README's obsolete branch and another machine's absolute folder.
- Documented PowerShell/Git Bash commands and separate helper/manual database routes.
- Documented port/origin matching, private generated credentials, first provisioning,
  restart/persistence and ordinary setup failures without database resets.
- npm reported the existing ESLint deprecation and an embedded-Postgres package
  install-script approval notice. npm ci still exited 0. Explicit portable
  POSTGRES_BIN avoided reliance on that package's install script; no global tools,
  dependencies or script-approval policy were changed.
- Expected `request_failed` entries are injected failure tests; pool-client removal
  entries are cleanup logs. Assertions passed.
- Fresh OS installation, independent teammate usability, interactive psql role
  creation, persistent `npm run local` startup, and the manual browser demonstration
  were not repeated. Browser tests and dependency audit were not rerun for this
  documentation-only change; SCRUM-38 has its own dated results.

Prerequisite installers, registry access and process permissions must be available
on a new machine. The clean dependency installation and PostgreSQL process checks
required network/process access. No normal project `.env`, data or SQL edit was
modified. Clean-copy output remains ignored under build for inspection.

See [installation guide](../../setup-and-execution.md) and
[Jira acceptance evidence](../../scrum-39-jira-evidence.md).
