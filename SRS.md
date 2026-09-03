# Software Requirements Specification (SRS)

**Project:** Bank Management System
**Team:** Team 6
**Version:** 1.0
**Date:** 03-09-2026
**Status:** Draft

## Team Members

| USN | Name |
|---|---|
| PES2UG24CS167 | Ganavi Purushothama |
| PES2UG24CS152 | DEVOPAM PAL |
| PES2UG24CS154 | DEEPTHI V |
| PES2UG24CS161 | Divyanshi Verma |

## Revision History

| Version | Date | Author | Change Summary | Approval |
|---|---|---|---|---|
| 1.0 | 03-09-2026 | Team 6 | Initial SRS draft | Pending |

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [External Interface Requirements](#3-external-interface-requirements)
4. [System Features (Detailed)](#4-system-features-detailed)
5. [Non-Functional Requirements](#5-non-functional-requirements-detailed)
6. [Quality Attributes & Acceptance Tests](#6-quality-attributes--acceptance-tests)
7. [System Models and Diagrams](#7-system-models-and-diagrams)
8. [Requirements Traceability Matrix (RTM)](#8-requirements-traceability-matrix-rtm)

---

## 1. Introduction

### 1.1 Purpose

This document is a Software Requirements Specification (SRS) for the **Bank Management System**, a console-based application built in C/C++. It describes the functional and non-functional requirements of a system designed to handle core banking operations such as account creation, deposits, withdrawals, and balance inquiry. This document is intended for the development team, course instructors, and evaluators.

### 1.2 Scope

The Bank Management System will allow a bank to manage customer accounts and perform basic banking transactions through a menu-driven console application. The system covers:

- Creation and management of customer accounts
- Deposit and withdrawal of funds
- Balance inquiry
- Persistent storage of account data (file-based)
- Basic authentication for account access

The system does **not** cover: multi-branch networking, real-time interbank transfers, mobile/web interfaces, or integration with external payment gateways. It is intended as an academic/learning project rather than a production banking system.

### 1.3 Audience

Developers (Team 6), Course Instructor/Evaluator, QA reviewers (peer teams).

### 1.4 Definitions, Acronyms and Abbreviations

| Term | Definition |
|---|---|
| SRS | Software Requirements Specification |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| UI | User Interface |
| CLI | Command Line Interface |
| PIN | Personal Identification Number |
| DB | Database / Data file |
| RTM | Requirements Traceability Matrix |

---

## 2. Overall Description

### 2.1 Product Perspective

The Bank Management System is a standalone, self-contained console application. It is not a component of a larger existing system. It interacts with a local data file (or lightweight file-based database) to persist account records between sessions.

### 2.2 Major Product Functions

- Create a new customer account
- Authenticate a user (account number + PIN)
- Deposit money into an account
- Withdraw money from an account
- Check account balance
- View a mini-statement / transaction history
- Update account holder details
- Close/delete an account
- Admin functions: view all accounts, search account by number/name

### 2.3 User Roles and Characteristics

| Role | Description |
|---|---|
| Customer | End user who performs deposit, withdrawal, and balance inquiry on their own account. Assumed to have basic computer literacy. |
| Bank Admin/Employee | Manages accounts, can create/close accounts and view all records. Assumed to be trained on the system. |

### 2.4 Operating Environment

- Runs on Windows/Linux desktop or lab machines
- Compiled using GCC/G++ (C/C++11 or later)
- No GUI — text-based console interface
- Data persisted using local files (text/binary) or a simple embedded DB (e.g., SQLite, optional)

### 2.5 Constraints

- Must be implemented in C or C++ (per project brief)
- No external network dependency required
- Limited development timeline (academic semester project)
- Single-machine, single-user-at-a-time operation (no concurrency handling required)

### 2.6 Assumptions and Dependencies

- Users have valid, unique account numbers assigned at account creation
- The host machine has a working C/C++ compiler and file system access
- Data file is not corrupted or tampered with outside the application

---

## 3. External Interface Requirements

### 3.1 User Interfaces

- Text-based menu-driven CLI with numbered options (e.g., 1. Create Account, 2. Deposit, 3. Withdraw, 4. Balance Inquiry, 5. Exit)
- Clear prompts and input validation messages
- Formatted tabular output for statements and account lists

### 3.2 Hardware Interfaces

- Standard keyboard for input
- Standard monitor/terminal for output
- Local disk storage for persisting account data files

### 3.3 Software Interfaces

- File I/O interface (C `stdio.h`/`fstream`) for reading/writing account records
- Optional: SQLite C API if a database is used instead of flat files

### 3.4 Communications Interfaces

- Not applicable — the system is a standalone offline application with no network communication requirement in this version.

---

## 4. System Features (Detailed)

> Each requirement includes acceptance criteria and a reference test case. IDs follow **BMS-F-###**.

### 4.1 Account Management

Description: Create, update, view, and close customer accounts.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test Ref | Comments/Dependencies |
|---|---|---|---|---|---|---|
| BMS-F-001 | The system shall allow an admin to create a new account by capturing name, initial deposit, and generating a unique account number. | Functional | High | Business | AC-001: New account created with unique ID and correct initial balance. Test: TC-Acc-01 | Requires file/DB write |
| BMS-F-002 | The system shall assign a unique account number automatically and prevent duplicates. | Functional | High | Business | AC-002: No two accounts share an account number. Test: TC-Acc-02 | — |
| BMS-F-003 | The system shall require a minimum initial deposit to open an account. | Functional | Medium | Business | AC-003: Account creation rejected if deposit < minimum. Test: TC-Acc-03 | Minimum configurable |
| BMS-F-004 | The system shall allow an admin to view details of any account by account number. | Functional | Medium | Admin | AC-004: Correct account details displayed. Test: TC-Acc-04 | — |
| BMS-F-005 | The system shall allow an admin to close/delete an account. | Functional | Medium | Business | AC-005: Closed account no longer accessible; balance settled. Test: TC-Acc-05 | — |
| BMS-F-006 | The system shall allow updating of customer contact details (name/phone/address). | Functional | Low | Customer | AC-006: Updated details persist and display correctly. Test: TC-Acc-06 | — |

### 4.2 Authentication

Description: Verify identity of a user before allowing account operations.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test Ref | Comments/Dependencies |
|---|---|---|---|---|---|---|
| BMS-F-007 | The system shall authenticate a customer using account number and PIN before allowing deposit/withdrawal/balance inquiry. | Functional | High | Security | AC-007: Access denied on incorrect account number or PIN. Test: TC-Auth-01 | — |
| BMS-F-008 | The system shall mask PIN entry on screen where the console supports it. | Functional | Medium | Security | AC-008: PIN characters not visibly echoed. Test: TC-Auth-02 | Console-dependent |
| BMS-F-009 | The system shall lock further attempts after 3 consecutive failed PIN entries within a session. | Functional | High | Security | AC-009: 4th consecutive failed attempt blocks further tries and logs the event. Test: TC-Auth-03 | — |

### 4.3 Deposit

Description: Allow a customer to deposit funds into their own account.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test Ref | Comments/Dependencies |
|---|---|---|---|---|---|---|
| BMS-F-010 | The system shall allow a customer to deposit a positive amount into their authenticated account. | Functional | High | Business | AC-010: Balance increases exactly by deposit amount. Test: TC-Dep-01 | — |
| BMS-F-011 | The system shall reject deposit amounts that are zero, negative, or non-numeric. | Functional | High | Business | AC-011: Invalid input rejected with error message; balance unchanged. Test: TC-Dep-02 | — |
| BMS-F-012 | The system shall record every deposit as a transaction entry with timestamp and amount. | Functional | Medium | Audit | AC-012: Transaction log contains new entry after deposit. Test: TC-Dep-03 | Depends on 4.6 |

### 4.4 Withdrawal

Description: Allow a customer to withdraw funds from their own account, subject to balance rules.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test Ref | Comments/Dependencies |
|---|---|---|---|---|---|---|
| BMS-F-013 | The system shall allow a customer to withdraw an amount not exceeding their current balance. | Functional | High | Business | AC-013: Withdrawal succeeds only if amount ≤ balance. Test: TC-Wd-01 | — |
| BMS-F-014 | The system shall reject withdrawal requests that would result in a negative balance below the minimum balance requirement. | Functional | High | Business | AC-014: Withdrawal rejected with clear message when insufficient funds. Test: TC-Wd-02 | — |
| BMS-F-015 | The system shall record every withdrawal as a transaction entry with timestamp and amount. | Functional | Medium | Audit | AC-015: Transaction log contains new entry after withdrawal. Test: TC-Wd-03 | Depends on 4.6 |

### 4.5 Balance Inquiry

Description: Allow a customer to view their current account balance.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test Ref | Comments/Dependencies |
|---|---|---|---|---|---|---|
| BMS-F-016 | The system shall display the current balance of an authenticated customer's account on request. | Functional | High | Business | AC-016: Displayed balance matches stored balance exactly. Test: TC-Bal-01 | — |

### 4.6 Transaction History / Mini-Statement

Description: Maintain and display a record of recent transactions.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test Ref | Comments/Dependencies |
|---|---|---|---|---|---|---|
| BMS-F-017 | The system shall maintain a persistent log of all deposit and withdrawal transactions per account. | Functional | Medium | Audit | AC-017: Log file/table contains all past transactions after restart. Test: TC-Hist-01 | File/DB persistence |
| BMS-F-018 | The system shall display the last N transactions (mini-statement) for an authenticated account on request. | Functional | Medium | Customer | AC-018: Correct chronological list of recent transactions shown. Test: TC-Hist-02 | — |

### 4.7 Data Persistence

Description: Ensure account and transaction data survive application restarts.

| Req ID | Requirement (shall...) | Type | Priority | Source | Acceptance Criteria / Test Ref | Comments/Dependencies |
|---|---|---|---|---|---|---|
| BMS-F-019 | The system shall save all account data to a file/database before program exit or after each transaction. | Functional | High | Reliability | AC-019: Data present after restart matches last known state. Test: TC-Persist-01 | — |
| BMS-F-020 | The system shall load existing account data from file/database on startup. | Functional | High | Reliability | AC-020: Previously created accounts are available immediately after restart. Test: TC-Persist-02 | — |

---

## 5. Non-Functional Requirements (Detailed)

> IDs follow **BMS-NF-###**.

| Req ID | Requirement | Category | Priority | Acceptance Criteria / Measurement |
|---|---|---|---|---|
| BMS-NF-001 | Any single transaction (deposit/withdrawal/balance inquiry) shall complete and display a result within 2 seconds under normal load on the target machine. | Performance | High | Manual timing test; Test: TC-Perf-01 |
| BMS-NF-002 | The system shall correctly persist data even if the application is closed normally after a transaction (no silent data loss). | Reliability | High | Restart test confirms no data loss; Test: TC-Rel-01 |
| BMS-NF-003 | The system shall validate all user inputs (menu choices, amounts, account numbers) and never crash on invalid input. | Robustness | High | Fuzz/invalid-input test suite passes; Test: TC-Rob-01 |
| BMS-NF-004 | The CLI menus and prompts shall be clear enough that a first-time user can complete a deposit within 3 attempts without external help. | Usability | Medium | Informal usability walkthrough; Test: TC-UX-01 |
| BMS-NF-005 | The codebase shall be modular (separate functions/files for account management, transactions, and file I/O) to support maintainability. | Maintainability | Medium | Code review checklist; Test: TC-Maint-01 |
| BMS-NF-006 | The system shall support at least 500 customer accounts without noticeable performance degradation. | Scalability | Low | Load test with 500 dummy accounts; Test: TC-Scale-01 |

### 5.1 Security

#### 5.1.1 Security Objectives

1. **Confidentiality of credentials:** PINs must not be stored or displayed in plain, easily readable form during normal operation.
2. **Integrity of financial data:** Account balances and transaction records must not be alterable except through validated deposit/withdrawal operations.

#### 5.1.2 Security Requirements

| Req ID | Requirement (shall...) | Type | Priority | Acceptance Criteria / Test Ref |
|---|---|---|---|---|
| BMS-SR-001 | The system shall require account number + PIN authentication before any account-specific operation. | Security | High | AC: No transaction possible without successful auth. Test: TC-Sec-01 |
| BMS-SR-002 | The system shall store PINs in a hashed or obfuscated form rather than plain text in the data file. | Security | High | AC: Data file inspection shows no plain-text PINs. Test: TC-Sec-02 |
| BMS-SR-003 | The system shall lock an account's access after 3 consecutive failed PIN attempts and require admin intervention to unlock. | Security | High | AC: Locked account cannot authenticate until reset. Test: TC-Sec-03 |
| BMS-SR-004 | The system shall restrict admin-only functions (view all accounts, delete account) to an authenticated admin session. | Security | High | AC: Customer session cannot access admin menu. Test: TC-Sec-04 |
| BMS-SR-005 | The system shall log security-relevant events (failed logins, account lockouts, account deletions) with timestamps. | Security | Medium | AC: Security log contains expected entries after test scenarios. Test: TC-Sec-05 |

---

## 6. Quality Attributes & Acceptance Tests

- **Exit criteria for acceptance:** All high-priority functional requirements implemented and verified; no critical NFR failures; RTM shows all test cases passed or explicitly waived.
- **Acceptance test suites:** Account Creation, Authentication, Deposit, Withdrawal, Balance Inquiry, Transaction History, Persistence, and Security.

---

## 7. System Models and Diagrams

### 7.1 UML Use-Case Diagram

*(To be added — at least 1 use-case diagram showing actors: Customer and Admin, with use cases: Create Account, Authenticate, Deposit, Withdraw, Check Balance, View Statement, Close Account.)*

### 7.2 Notes

Diagrams (use-case, and optionally a flowchart of the transaction process) should be inserted here as image files once created (e.g., via draw.io or Lucidchart), and linked/embedded in this Markdown file.

---

## 8. Requirements Traceability Matrix (RTM)

| Req ID | Requirement (short) | Section Ref | Module | Test Case(s) | Status (N/P/A) | Comments |
|---|---|---|---|---|---|---|
| BMS-F-001 | Create account | 4.1 | AccountModule | TC-Acc-01 | N | |
| BMS-F-007 | Authenticate user | 4.2 | AuthModule | TC-Auth-01 | N | |
| BMS-F-010 | Deposit funds | 4.3 | TransactionModule | TC-Dep-01 | N | |
| BMS-F-013 | Withdraw funds | 4.4 | TransactionModule | TC-Wd-01, TC-Wd-02 | N | |
| BMS-F-016 | Balance inquiry | 4.5 | AccountModule | TC-Bal-01 | N | |
| BMS-F-019 | Persist data | 4.7 | FileIOModule | TC-Persist-01 | N | |
| BMS-NF-001 | Response time target | 5 | All | TC-Perf-01 | N | |
| BMS-SR-002 | PIN not stored plain-text | 5.1.2 | AuthModule | TC-Sec-02 | N | |

*(N = Not tested, P = Pass, A = Actioned/Fail — update as testing progresses.)*
