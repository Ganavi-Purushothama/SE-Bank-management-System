# Test and coverage code

Reference copies from tested main revision `729f5c35e3aba21da91585636fd6fea87bcc6e43`, dated 11 November 2026.

- tests/: all Node test cases, fixtures, browser server and Playwright scenarios.
- core/: the C++ rules and IPC program instrumented for gcov.
- scripts/build.mjs: normal engine build.
- scripts/test-postgres.mjs: original disposable PostgreSQL test launcher.
- scripts/test-postgres.coverage.mjs: collector copy with only two test-runner arguments added after --test: experimental coverage and the server inclusion filter.
- package.json and playwright.config.js: command/dependency declarations and browser settings.
- [test-commands.md](test-commands.md): exact collection commands and scope.
- [summarize-gcov.mjs](summarize-gcov.mjs): the project-only line/branch calculation used to interpret gcov JSON.

These are archival reference copies, not a second runnable application. Their relative imports expect server/, public/ and migrations/ from a full checkout of the recorded revision. Run tests from that full checkout, not from this code directory. The copied fixture credentials are fictional disposable-test credentials; no .env, local-login.txt or normal database credentials are included. Copying code into a report does not modify the live application or create new test coverage. Dependencies were already installed and reused for the isolated copy.

The current report run uses an -O0 --coverage C++ build in an isolated main worktree. Normal npm test scripts rebuild at -O2 without coverage. The instrumented run executes the same source/tests, with a temporary PostgreSQL launcher that enables Node's coverage reporter. Application files are unchanged.
