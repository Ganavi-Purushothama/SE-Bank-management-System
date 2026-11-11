# Branch Coverage Report

Execution date: **11 November 2026 (Asia/Calcutta)**. Tested source: `729f5c35e3aba21da91585636fd6fea87bcc6e43` (main after PR #23). Environment: Windows, Node 24.22.1 (x64), npm 11.19.1, G++/gcov 16.2.0, PostgreSQL 18.4, Playwright 1.64.1 / Chromium.

## Meaning and method

Branch coverage measures whether alternative control-flow outcomes were taken. Reaching a line does not imply both outcomes of its condition were tested. Node/V8 and GCC/gcov define branches differently, so their percentages remain separate.

## JavaScript results

| Run and scope | Branch coverage |
|---|---:|
| PGlite regression: loaded server/*.js plus public/statement-csv.js | 91.70% |
| Real PostgreSQL: loaded server/*.js | 92.52% |

Per-file results are in the [code coverage report](code-coverage-report.md) and raw console tables. The real PostgreSQL run reports banking.js, crypto.js, errors.js, statements.js and validation.js at 100% of the measured branch set. core.js is 64.29%, app.js 87.50%, auth.js 97.67% and db.js 86.67%. These figures apply to executed/included modules, not all repository files. The apparent 100% branch value for nearly unexecuted db.js in the PGlite table is not proof that its transaction decisions were exercised; use the real PostgreSQL measurement.

## C++ branch outcomes

| File | Taken / measured gcov branch edges | Taken at least once % |
|---|---:|---:|
| core/main.cpp | 47/79 | 59.49 |
| core/banking.hpp | 39/46 | 84.78 |
| Total C++ project files | 86/125 | 68.80 |

These are gcov branch edges including compiler-generated exception paths; standard-library files are excluded. The GCC branch denominator is not directly comparable with V8's branch denominator. The C++ line result is 100%, while branch coverage is 68.80%, demonstrating that line and branch coverage answer different questions. Raw edge counts, line numbers and throw flags are in [cpp-gcov.json](evidence/cpp-gcov.json).

## Remaining work

Potential additions include engine spawn/timeout/malformed-response failures, API health failure/config routes and remaining auth error conditions. Review uncovered C++ edges to distinguish meaningful compound-condition outcomes from compiler exception paths before adding tests. No tests were changed solely to improve a percentage. Frontend branch coverage and startup-subprocess branch coverage were not collected. No branch threshold was supplied, and these results do not establish exhaustive decision or security coverage.

Exact collection commands and tools are recorded in [code](code/README.md).
