# Code Coverage Report

Execution date: **11 November 2026 (Asia/Calcutta)**. Tested source: `729f5c35e3aba21da91585636fd6fea87bcc6e43` (main after PR #23). Environment: Windows, Node 24.22.1 (x64), npm 11.19.1, G++/gcov 16.2.0, PostgreSQL 18.4, Playwright 1.64.1 / Chromium.

## Measurement and scope

Line coverage measures executable lines reached; function coverage measures functions called. Node's experimental V8 test coverage measures executed JavaScript modules matching the inclusion filters. GCC/gcov measures the two C++ project files with an instrumented build. No application source was modified to collect these measurements. Separate runs have separate denominators; they are not combined or averaged into a whole-project score.

## JavaScript PGlite regression run

Loaded modules matching server/*.js and public/statement-csv.js: **92.91% lines**, **90.36% functions**, **91.70% branches**.

| File | Line % | Branch % | Function % | Uncovered lines |
|---|---:|---:|---:|---|
| statement-csv.js | 100.00 | 78.57 | 100.00 | — |
| app.js | 96.17 | 87.50 | 87.50 | 57-60 63-69 97-99 |
| auth.js | 100.00 | 97.67 | 100.00 | — |
| banking.js | 100.00 | 100.00 | 100.00 | — |
| config.js | 100.00 | 81.82 | 100.00 | — |
| core.js | 88.46 | 64.29 | 57.14 | 18-19 22-23 45-46 |
| crypto.js | 100.00 | 100.00 | 100.00 | — |
| db.js | 5.97 | 100.00 | 0.00 | 4-49 51-67 |
| errors.js | 100.00 | 100.00 | 100.00 | — |
| statements.js | 100.00 | 100.00 | 100.00 | — |
| validation.js | 100.00 | 100.00 | 100.00 | — |

## JavaScript real PostgreSQL run

Loaded modules matching server/*.js: **97.53% lines**, **90.48% functions**, **92.52% branches**. This run exercises the actual pg adapter, migration and transaction wrapper.

| File | Line % | Branch % | Function % | Uncovered lines |
|---|---:|---:|---:|---|
| app.js | 96.17 | 87.50 | 87.50 | 57-60 63-69 97-99 |
| auth.js | 100.00 | 97.67 | 100.00 | — |
| banking.js | 100.00 | 100.00 | 100.00 | — |
| core.js | 88.46 | 64.29 | 57.14 | 18-19 22-23 45-46 |
| crypto.js | 100.00 | 100.00 | 100.00 | — |
| db.js | 89.55 | 86.67 | 80.00 | 20-26 |
| errors.js | 100.00 | 100.00 | 100.00 | — |
| statements.js | 100.00 | 100.00 | 100.00 | — |
| validation.js | 100.00 | 100.00 | 100.00 | — |

The PGlite run barely executes db.js because it supplies a different fixture adapter. The PostgreSQL run is the relevant adapter measurement. db.js lines 20–26 (queryWithTimeout) remain unexecuted in this collection. app.js health/config and password-change error paths, and core.js process/timeout/response failures, also contain uncovered lines.

## C++ coverage

GCC/gcov includes core/main.cpp and core/banking.hpp only, excluding standard-library headers. Data accumulated across the unit, PGlite regression and real PostgreSQL runs in the isolated copy.

| File | Executed / executable lines | Line % |
|---|---:|---:|
| core/main.cpp | 18/18 | 100.00 |
| core/banking.hpp | 11/11 | 100.00 |
| Total C++ project lines | 29/29 | 100.00 |

Every executable C++ source line was reached, but not every branch outcome was taken. Several decisions share a source line. See [branch report](branch-coverage-report.md).

## Exclusions and evidence

Browser public/app.js, HTML/CSS, external libraries, SQL engine internals and server/index.js startup-subprocess coverage are not included in these JavaScript percentages. Browser scenario passes do not measure frontend code coverage. Schema/SQL behavior is validated through assertions rather than a SQL line-coverage tool. This is scoped measured coverage, not a whole-project 100% claim. No numerical coverage threshold is specified in the supplied Test Plan, so no invented threshold is used for signoff.

Evidence: [PGlite coverage](evidence/javascript-coverage.txt), [PostgreSQL coverage](evidence/postgres-coverage.txt), [project-only gcov JSON](evidence/cpp-gcov.json), [summary JSON](evidence/coverage-summary.json). [Commands](code/test-commands.md) reproduce the collection.
