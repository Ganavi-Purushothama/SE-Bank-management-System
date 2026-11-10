# Installation and execution (SCRUM-39)

This guide runs the academic Bank Six application from a new checkout. Use only
fictional banking data. Express serves the browser files and calls the compiled
C++ engine; PostgreSQL is the persistent database. No separate frontend server,
TypeScript compiler, Docker installation or global npm package is required.

## Prerequisites

| Requirement | Purpose and verification |
|---|---|
| Git | Clone/check out the reviewed source; `git --version` |
| Node.js >=22.12 with npm | Server, scripts and locked dependencies; `node --version`, `npm --version` |
| GCC/G++ supporting C++17, on PATH | Compile the banking engine; `g++ --version`; set `CXX` to a compatible compiler executable if needed |
| PostgreSQL server binaries | Normal database or project-owned development cluster; `psql --version`; local helper requires `initdb` and `pg_ctl` too |
| Modern browser | Open the application at its configured origin |

Windows: install Node, Git for Windows, GCC/G++ (for example through MSYS2) and
PostgreSQL separately, add their executable directories to PATH, and reopen VS
Code/your terminal. On Linux/macOS install the same tools through your normal
package manager; run PostgreSQL initialization as a normal OS user, not root.
This project does not install OS tools or a database service automatically.

The supplied Windows commands use PowerShell unless a block says Bash or SQL.
Git Bash supports the npm/git commands; use `cp` instead of `Copy-Item`,
`export NAME=value` instead of `$env:NAME=value`, and `/c/...` paths where needed.

## Get source and dependencies

```bash
git clone https://github.com/Ganavi-Purushothama/SE-Bank-management-System.git
cd SE-Bank-management-System
# Until this work is merged, use the branch containing these instructions:
git switch codex/scrum-39-installation-execution
npm ci
npm run build
```

Use `main` once these changes are merged there. A branch must be published before
another machine can check it out. Avoid the old `implementation/bank-system`
checkout instructions for reviewing current sprint work. In an existing clone,
fetch the branch first and preserve any unrelated local changes before switching.

`npm ci` installs the versions from `package-lock.json`; it needs registry access
or a populated npm cache. It replaces `node_modules`, so use it in your intended
checkout. Runtime packages are Express, cookie-parser, express-rate-limit,
Helmet and pg. Development packages provide PGlite, embedded PostgreSQL,
Playwright, ESLint and Prettier; they are installed locally by the same command.

`npm run build` compiles `core/main.cpp` to `build/bank-core.exe` on Windows or
`build/bank-core` elsewhere with C++17 and warnings as errors. A clean checkout
has no binary: always build on the target OS. Do not copy another OS's binary.

Choose one database setup route below; do not combine the helper's generated
database credentials with an independently installed database.
