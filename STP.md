# Software Test Plan (STP)

**Project:** Bank Management System
**Version:** 1.0
**Authors:** Team 6 — Ganavi Purushothama, DEVOPAM PAL, DEEPTHI V, Divyanshi Verma
**Date:** 13-09-2026
**Status:** Draft

## 1. Introduction

**Purpose:** This document defines the test plan for the Bank Management System v1.0 (hosted web edition). It outlines objectives, scope, strategy, resources, schedule, and responsibilities for testing.

**Scope:** Testing covers the web-hosted Bank Management System's features — authentication, deposit, withdrawal, balance inquiry, transaction history, account management, and admin functions. The correctness of the C/C++ Core Engine's rule validation is a primary focus, alongside the Node.js/Express backend and SQL persistence layer. Third-party infrastructure (hosting platform internals, browser engine behavior) is excluded.

**References:** `SRS.md` (v2.0), `SAD.md` (v1.0), `BMS_Component_Diagram_UML.drawio`, `BMS_Sequence_Login.drawio`, `BMS_Sequence_Deposit.drawio`.

**Definitions:**

| Term | Definition |
|---|---|
| STP | Software Test Plan |
| SRS | Software Requirements Specification |
| SAD | Software Architecture and Design Specification |
| RTM | Requirements Traceability Matrix |
| Core Engine | The compiled C/C++ executable performing banking business logic |
| UAT | User Acceptance Testing |
| PIN | Personal Identification Number |

## 2. Test Items

- Authentication module (login, session, lockout)
- Account Management module (registration, update, close)
- Deposit module (Express route + Core Engine validation)
- Withdrawal module (Express route + Core Engine validation)
- Balance Inquiry module
- Transaction History module
- Admin Dashboard (view/search accounts, unlock accounts)
- Core Engine (C/C++) — standalone rule validation logic
- Database layer (SQL schema, persistence, query correctness)

## 3. Features to be Tested

Features mapped to SRS requirement IDs:

- BMS-F-001 to BMS-F-006: Account registration, update, close, admin view
- BMS-F-007 to BMS-F-009: Authentication, session handling, lockout
- BMS-F-010 to BMS-F-012: Deposit and validation
- BMS-F-013 to BMS-F-015: Withdrawal and validation
- BMS-F-016: Balance inquiry
- BMS-F-017 to BMS-F-018: Transaction history / mini-statement
- BMS-F-019 to BMS-F-020: Data persistence and schema initialization
- BMS-NF-001 to BMS-NF-007: Performance, reliability, robustness, usability, maintainability, scalability, concurrency
- BMS-SR-001 to BMS-SR-007: Security requirements (session enforcement, password hashing, lockout, RBAC, logging, SQL injection prevention, HTTPS)

## 4. Features Not to be Tested

- Underlying correctness of third-party libraries (Express, bcrypt, SQL driver internals) — assumed tested by their maintainers
- Browser rendering engine behavior across every possible browser/version combination — tested only on Chrome, Firefox, and Edge (current versions)
- Hosting platform infrastructure reliability (uptime of the hosting provider itself, if publicly deployed)
- Physical network hardware / ISP-level connectivity issues

## 5. Test Approach / Strategy

**Levels:**
- Unit tests (Core Engine functions in isolation; individual Express route handlers)
- Integration tests (Express ↔ Core Engine IPC; Express ↔ SQL Database)
- System tests (end-to-end browser-to-database flow for each feature)
- Acceptance tests (informal UAT with teammates/instructor walkthrough)

**Types:**
- Functional testing (core banking features)
- Regression testing (after each merge to main, re-run core suite)
- Performance testing (response time under normal and light concurrent load)
- Usability testing (UI clarity for first-time users)
- Security testing (see Section 5.1)

**Entry Criteria:** Stable build available on a feature branch or main, test environment set up (Node.js, compiled Core Engine binary, initialized database), test data (dummy accounts) available.

**Exit Criteria:**100% of planned test cases executed, 0 critical defects open (e.g., incorrect balance calculation, authentication bypass), all high-priority SRS acceptance criteria satisfied, RTM shows no unaddressed high-priority requirement.

### 5.1 Security Validation

- Validate password/PIN handling — confirm hashing (bcrypt), never logged or returned in API responses (BMS-SR-002)
- Confirm session cookies are used correctly and expire appropriately (BMS-F-008)
- Confirm account lockout triggers after 3 consecutive failed login attempts (BMS-F-009, BMS-SR-003)
- Confirm admin-only routes reject non-admin sessions server-side, not just hidden in UI (BMS-SR-004)
- SQL injection attempts against all form inputs (login, deposit, withdrawal, search) — confirm parameterized queries hold (BMS-SR-006)
- Confirm HTTPS is enforced if/when publicly deployed (BMS-SR-007)
- Basic fuzzing of amount fields (negative numbers, non-numeric strings, extremely large values) against both frontend validation and the Core Engine's authoritative check

## 6. Test Environment

**Hardware:** Standard development laptops (Windows/Linux/Mac); no specialized hardware required.

**Software:**
- Node.js (v18+) with Express
- Compiled C/C++ Core Engine executable (GCC/G++)
- SQL database — SQLite for local testing, PostgreSQL/MySQL if testing against a hosted instance
- Modern browsers: Chrome, Firefox, Edge (latest stable versions)

**Tools:**
- **Postman** — API/route testing (login, deposit, withdraw, balance endpoints)
- **Manual browser testing** — UI walkthroughs for usability and functional checks
- A lightweight load-testing tool (e.g., **Apache Bench** or **Artillery**) — for BMS-NF-001 (response time) and BMS-NF-007 (concurrency)
- **GitHub Issues** — defect tracking (in place of Jira, given team size and tooling)

**Test Data:** Dummy customer accounts with varying balances, including edge cases (zero balance, at minimum-balance threshold, large balance).

## 7. Test Schedule

> Dates are illustrative — align with your team's actual sprint/submission calendar.

| Milestone | Target Date |
|---|---|
| Test case design | TBD — after Core Engine IPC contract is frozen |
| Test environment setup | TBD — after initial backend + Core Engine integration |
| Test execution start | TBD |
| Test execution end | TBD |
| Informal UAT / demo walkthrough | Before final submission deadline |

## 8. Test Deliverables

- Test Plan (this document)
- Test Cases (manual, referenced by TC-ID in the SRS RTM)
- Test Scripts (Postman collection for API routes; any automated scripts written)
- Test Data (seed scripts for dummy accounts)
- Test Execution Logs
- Defect Reports (GitHub Issues)
- Test Summary Report (produced at the end of the test cycle)

## 9. Roles and Responsibilities

| Role | Name | Responsibility |
|---|---|---|
| QA Lead | Ganavi Purushothama | Prepare and maintain this test plan, coordinate execution across the team |
| Test Engineer (Core Engine) | DEVOPAM PAL | Unit-test the C/C++ Core Engine logic, verify rule correctness in isolation |
| Test Engineer (Backend/API) | DEEPTHI V | Test Express routes, session handling, and Express↔Core Engine integration |
| Test Engineer (Frontend/DB) | Divyanshi Verma | Test UI flows end-to-end, database persistence, and run security checks |

> Since this is a 4-person team without a dedicated separate developer/QA split, each member tests the module they are least likely to have personally implemented, where feasible, to reduce blind spots.

## 10. Risks and Mitigation

| Risk | Mitigation |
|---|---|
| Core Engine IPC contract changes late, breaking integration tests | Freeze the contract early (see SAD Section 4.3.2) and version-control it explicitly |
| Team members test only their own code, missing integration bugs | Assign each person to test a module they didn't primarily build, per Section 9 |
| Limited time for security/performance testing given course timeline | Prioritize high-priority security requirements (BMS-SR-002, 003, 004, 006) over lower-priority load testing (BMS-NF-006) if time runs short |
| Hosting platform unavailable during demo | Have a local-hosting fallback ready and tested in advance (per SRS Section 9.3) |
| SQLite vs. PostgreSQL behavior differences if switching databases late | Decide on final DB choice early and test against that exact database, not a substitute |

## 11. Assumptions & Dependencies

- The Core Engine executable is compiled and available before integration testing begins
- Test data (dummy accounts) can be freely created and reset without affecting any real data (none exists — this is a course project)
- All team members have a working local environment (Node.js, compiler, database) before test execution starts

## 12. Suspension & Resumption Criteria

**Suspend testing if:**
- The build fails to start (server crashes on launch) or the Core Engine binary fails to compile
- A blocking defect prevents more than 30% of planned test cases from being executed (e.g., login is completely broken, blocking all authenticated-route tests)

**Resume testing if:**
- The blocking defect is fixed and verified with a smoke test
- The environment (server + Core Engine + database) is confirmed stable

## 13. Test Case Management & Traceability

The RTM in `SRS.md` (Section 10) maps requirements to test case IDs. Representative examples:

- BMS-F-007 (Authenticate) → TC-Auth-01, TC-Auth-02, TC-Auth-03
- BMS-F-010 (Deposit) → TC-Dep-01, TC-Dep-02, TC-Dep-03
- BMS-F-013 (Withdraw) → TC-Wd-01, TC-Wd-02, TC-Wd-03
- BMS-NF-001 (Response time) → TC-Perf-01
- BMS-SR-002 (Password hashing) → TC-Sec-02
- BMS-SR-006 (SQL injection prevention) → TC-Sec-06

Full requirement-to-test-case mapping is maintained in the SRS RTM to avoid duplicating and desynchronizing the same table across documents.

## 14. Test Metrics & Reporting

**Metrics collected:**
- % of planned test cases executed
- % passed / failed
- Number of open defects by severity (critical / major / minor)
- Requirement coverage (% of SRS requirements with at least one passing test case)

**Reports:**
- Informal status updates in the team group chat during the execution window
- Final Test Summary Report, produced at the end of the test cycle, summarizing pass/fail counts and any known open issues at submission time

## 15. Approvals

| Role | Name | Signature / Date |
|---|---|---|
| QA Lead | Ganavi Purushothama | |
| Course Coordinator | | |
