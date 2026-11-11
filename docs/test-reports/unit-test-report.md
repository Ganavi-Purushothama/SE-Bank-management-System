# Unit Test Report

Execution date: **11 November 2026 (Asia/Calcutta)**. Tested source: `729f5c35e3aba21da91585636fd6fea87bcc6e43` (main after PR #23). Environment: Windows, Node 24.22.1 (x64), npm 11.19.1, G++/gcov 16.2.0, PostgreSQL 18.4, Playwright 1.64.1 / Chromium.

## Objective and result

Verify individual banking rules and validation functions before relying on database/API workflows. **17 passed, 0 failed, 0 skipped**, using Node's built-in test runner and the actual compiled C++ executable. [Execution output](evidence/unit-tests.txt).

| Test file | Tests | Verification |
|---|---:|---|
| tests/core.test.js | 10 | Exact paise, C++ opening/deposit/withdrawal/settlement, invalid IPC, minimum/maximum boundaries, malformed arguments, password salt/verification |
| tests/validation.test.js | 5 | Decimal limits, UTF-8 password bytes, customer text, phone digit limits and pagination |
| tests/statement-period.test.js | 1 | Real ordered calendar dates, including leap-day handling |
| tests/statement-csv.test.js | 1 | Exact currency values, metadata, quoting and formula-safe text |

## Method

The isolated main copy was compiled with C++17, -O0, --coverage and warnings as errors so the same runs could also measure GCC coverage. No database or HTTP server is needed by this unit selection. Test-source copies are in [code/tests](code/tests/); exact commands are in [code/test-commands.md](code/test-commands.md). The normal npm run test:unit command uses the same file selection but an optimized, non-instrumented build.

Accepted values and rejection paths are asserted, including one-paise differences and exact limits. Passing assertions are evidence for these cases, not a coverage percentage. The combined regression suite repeats these unit cases, so its count is not additional independent unit coverage. No failing unit case remained in this run.
