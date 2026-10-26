# SE-Bank-Management-System

A web-based Bank Management System built as a Software Engineering course project — supporting account management, deposits, withdrawals, and balance inquiry through a browser interface, backed by a C/C++ core and a SQL database.

## Team 6

| USN | Name |
|---|---|
| PES2UG24CS167 | Ganavi Purushothama |
| PES2UG24CS152 | DEVOPAM PAL |
| PES2UG24CS154 | DEEPTHI V |
| PES2UG24CS161 | Divyanshi Verma |

## Project Overview

A system to handle core banking operations — deposit, withdrawal, and balance inquiry — for customer accounts, accessible online rather than as an offline console application.

**Core requirement:** business logic implemented in C/C++ (per course mandate), with a web-based front end so the app can be hosted and demoed live.

## Tech Stack

> 🚧 Final stack to be confirmed by the team — see [SRS.md](./SRS.md) for the architecture under discussion.

- **Core logic:** C / C++
- **Backend / Web layer:** TBD (Node.js + Express, or a C/C++ web framework — team decision pending)
- **Database:** SQL (PostgreSQL / SQLite — team decision pending)
- **Frontend:** HTML / CSS / JavaScript

## Repository Contents

| File | Description |
|---|---|
| `SRS.md` | Software Requirements Specification — functional & non-functional requirements, architecture, security, and RTM |
| `BMS_UseCase_Diagram_circular.drawio` | UML use-case diagram (open in [draw.io](https://app.diagrams.net)) |
| `README.md` | This file |

## Features

- Customer account creation and login
- Deposit and withdrawal with balance validation
- Balance inquiry
- Transaction history / mini-statement
- Admin dashboard: view all accounts, search accounts, unlock locked accounts
- Session-based authentication with account lockout after failed attempts

## Getting Started

```bash
git clone https://github.com/Ganavi-Purushothama/SE-Bank-management-System.git
cd SE-Bank-management-System
```

> Setup/run instructions will be added here once the backend stack is finalized and initial code is committed.

## Documentation

- Full requirements: [`SRS.md`](./SRS.md)
- Use-case diagram: [`BMS_UseCase_Diagram_circular.drawio`](./BMS_UseCase_Diagram_circular.drawio) — open with draw.io

## Status

🚧 In development — requirements and architecture finalized, implementation in progress.
