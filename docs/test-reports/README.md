# Test reports

Four requested reports and their supporting test code. Execution date: **11 November 2026 (Asia/Calcutta)**. Tested source: `729f5c35e3aba21da91585636fd6fea87bcc6e43` (main after PR #23). Environment: Windows, Node 24.22.1 (x64), npm 11.19.1, G++/gcov 16.2.0, PostgreSQL 18.4, Playwright 1.64.1 / Chromium.

| Report | Outcome |
|---|---|
| [Unit Test Report](unit-test-report.md) | 17 passed, no failures/skips |
| [System Validation Report](system-validation-report.md) | 41 regression passes (one PostgreSQL-only skip), 30 PostgreSQL passes, 4 browser passes |
| [Code Coverage Report](code-coverage-report.md) | Measured Node/V8 and GCC coverage, scoped by language and run |
| [Branch Coverage Report](branch-coverage-report.md) | Measured branch outcomes and remaining gaps |

[Code and reproduction](code/README.md) includes test-source copies, the C++ coverage target and collection commands. [Evidence](evidence/) contains fresh console output and machine-readable C++ coverage. Suites overlap; do not add their counts as unique cases. Reports use actual execution dates rather than backdating to the screenshot's 2–6 November schedule. Full Test Plan signoff is not claimed: independent acceptance, other browsers, hosted HTTPS and recovery exercises remain outside this local automated run. Application code and the original SQL edit were not modified.

The older user-supplied outputs had 40 regression and 29 PostgreSQL passes. These reports use the newer main revision, which adds a password-change test and raises those counts to 41 and 30.
