# Sprint 1 evaluation guide

Prepared 26 October 2026 for Tuesday **27 October 2026, fourth teaching hour**. This is a preparation record; live issue states, reviews and Actions can change after this snapshot.

## 1. Translate the announcement into deliverables

| Required by the announcement | Evidence to show | State at preparation |
|---|---|---|
| Features planned for Sprint 1 completed according to backlog | Actual Sprint-1 milestone issues, acceptance criteria, application workflow and tests | Implemented features mapped below; several tracker items remain open and need assignee acceptance verification |
| GitHub PRs | PR #13, its three commits and merged state | Present; merged into main at commit `514af32640b70d47ecff1d989d4db8f6737562b3` |
| GitHub reviews | Reviews made by actual teammates from their own accounts | **Gap: PR #13 has zero recorded reviews** at snapshot; genuine review still required |
| GitHub Actions | Open a completed successful run and expand job steps | Main run `40331522937` passed; PR run `40330141169` and implementation push runs passed too |
| One-minute demo uploaded to repository | `docs/evaluation/sprint1-demo.webm`, downloadable and playable | Created by this kit; verify the final file plays after publication |
| Follow submitted SRS/SAD/Test Plan | Requirements mapping, design decision record, test evidence | Available; document conflicts and unexecuted acceptance work must be disclosed |
| All four members attend | Presence of Ganavi, Devopam, Deepthi, Divyanshi | Human action: all attend; confirm college fourth-hour timing |

## 2. The actual Sprint 1 backlog

Source: GitHub issue milestone **Sprint-1**, not an invented sprint scope. Seven issues have that milestone; their stated story points total **50**. Scope and issue status are different from implementation readiness.

| Issue | Existing assignee(s) | Points | Tracker state at snapshot | Implementation evidence / acceptance walkthrough |
|---|---|---:|---|---|
| [#2 Design the System Architecture](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/2) | Ganavi, Divyanshi | 5 | Closed | Submitted SAD/component UML; explain browser → Express → C++ IPC → PostgreSQL and security boundaries |
| [#3 Coordinate Project Documentation and Delivery](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/3) | Ganavi | 5 | Open | README, API/schema/security/traceability reports, this handoff and video; check video upload and review evidence before closing |
| [#4 Implement Database and Backend Foundation](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/4) | Devopam | 8 | Open | Migration, users/accounts/transactions/sessions/audit tables, pool/transactions and parameterized SQL; persistence/fault tests |
| [#7 Implement Authentication and Security](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/7) | Deepthi | 8 | Open | Login/logout, salted hashes, persisted sessions, lockout, roles and ownership; auth/security tests |
| [#8 Implement Account Management](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/8) | Deepthi | 8 | Open | Admin opening, unique account number, authorized view/update, settled closure and retained history; API/browser tests |
| [#10 Build the Banking User Interface](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/10) | Ganavi | 8 | Closed | Login, overview, deposit/withdraw dialogs, history, profile and admin views; responsive browser workflow |
| [#11 Integrate Frontend, Backend, and Administration](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/issues/11) | Ganavi | 8 | Open | UI calls real endpoints; balances/history refresh; role-specific navigation and server enforcement; integration/E2E evidence |

**Do before evaluation:** each assignee runs their acceptance checks, records real results through their own account and updates their assigned issue when appropriate. This kit does not close issues or invent acceptance comments. Do not present five open issues as already closed or claim all 50 points are accepted merely because code exists.

Other issues: #1 requirements review is closed but has no milestone in the snapshot. #5 C++ banking transactions has **no assigned milestone**, so do not silently call it an originally planned Sprint-1 story. It is an implemented dependency used in the integration demo. #6 core tests, #9 history/statements and #12 integration/security/regression testing are assigned to **Sprint-2**; their existing implementation/test coverage can be shown as integrated work ahead of that milestone, not retroactively relabeled as Sprint-1 planning.

## 3. SRS, SAD and Test Plan alignment

| Topic | Submitted artifact | Delivered behavior and explanation |
|---|---|---|
| Account management | SRS F-001–006 | Admin opens/closes accounts; customer can update permitted contact details; account numbers generated; closure settles and retains ledger |
| Authentication | SRS F-007–009, SR-001–004 | Account-number/password login, masked entry, three-failure persistent lockout, admin unlock, session/role/ownership protection |
| Financial operations | SRS F-010–016 | Positive deposits/withdrawals, minimum/available-balance rules and accurate balance; C++ decision plus SQL transaction |
| History/persistence | SRS F-017–020 | Real PostgreSQL, opening/deposit/withdraw/settlement ledger; mini-statement and type/date filters |
| Components and interfaces | SAD sections 3–4 | HTML/CSS/JS frontend; Express web/auth/SQL; stateless C++ executable over bounded JSON stdin/stdout |
| Testing | STP unit/integration/system/security strategy | Actual C++ tests, API/security/fault tests, true PostgreSQL concurrency/restart/load tests and Chromium workflows |

Be candid about conflicts:

- SRS describes C++ HTTP/libpq; the later SAD explicitly selects Express + C++ IPC. The implementation follows the detailed SAD division and documents this deviation; do not claim the server uses libpq or a C++ web framework.
- SRS requires PostgreSQL; that is the application database. PGlite is used for isolated tests, never as a silent substitute for the actual app database.
- SAD/STP mention bcrypt; SAD permits an equivalent salted hash. The actual implementation uses Node scrypt, N=32768, r=8, p=1. Say **scrypt**, not bcrypt.
- F-009 describes three failures within a session; SR-003 requires an account lock until admin intervention. The implementation uses the stronger persisted account lock.
- Some STP version/requirement IDs/diagram references do not exist in the checked-in SRS. Original artifacts are preserved; `docs/audit-and-decisions.md` records the differences.
- HTTPS configuration support exists for production, but a local HTTP demo is **not a deployed HTTPS service**. Public hosting is not claimed.
- The mini-statement is rendered/paginated HTML, not a PDF-export feature. The SRS does not require a downloadable statement; #9's wording should be reviewed if the team intended a separate export feature.

## 4. Evidence already available

- [PR #13](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/pull/13): merged implementation.
- Backend/core commit `f903289`, frontend commit `3c32e66`, tests/docs/CI commit `416f6e9`.
- [Main Actions run](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/actions/runs/40331522937): success on merged main commit.
- [PR Actions run](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/actions/runs/40330141169): success.
- [Implementation push run](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/actions/runs/40330050690): success after the earlier browser-download delay.
- Local recorded verification: **19 unit/API**, **18 PostgreSQL**, **3 Chromium tests**, all passed; lint/format/build passed; advisory scan reported zero vulnerabilities at the time.
- 500 authenticated session reads over 100 reused HTTP connections were tested; this is not proof of 500 simultaneous new TCP sockets or production bank capacity.

When showing Actions, expand the actual steps rather than only pointing at a green badge: install, lint, format, C++/unit/API tests, PostgreSQL suite, browser installation/E2E and audit. Counts overlap because API cases run against two database runtimes. Do not add them into a unique test-coverage percentage.

## 5. Peer review — the human step still needed

An issue assignee is not the same thing as a commit author. A merged PR is not the same thing as a reviewed PR. The recorded implementation commits belong to Ganavi's Git account and were produced with coding-agent assistance. Teammates should understand, independently validate and review their assigned areas; do not rewrite authorship or backdate reviews.

Each reviewer should use their **own GitHub account**:

1. Read the changed code and the relevant SRS acceptance criteria.
2. Run the applicable check locally and note the exact command/result.
3. Review an open PR through **Files changed → Review changes**. Report actual findings, or say exactly what was checked before approving. An author cannot approve their own PR.
4. Existing merged PR #13 can be inspected for implementation evidence, but any review made now is retrospective and must be described that way. Use the open evaluation-kit PR for a genuine current review of these deliverables.
5. If a teammate finds a real defect or missing test, they should make a focused branch/commit/PR from their own account and have another member review it. Avoid empty or cosmetic PRs created only to inflate contribution counts.

Suggested review prompts, not fabricated completed reviews:

- Devopam: verify the arithmetic examples in the handoff, IPC contract, row-lock/rollback explanation and video balances against the C++/SQL code.
- Deepthi: verify account lifecycle, login/lockout/ownership explanation and that the recording reveals no credentials.
- Divyanshi: play the full video, independently run the UI flow, verify links/test evidence and check that the Sprint-1/Sprint-2 boundary is accurate.
- Ganavi: incorporate actual review findings, keep the checklist honest, coordinate issue updates and ensure the repository/main branch contains the final deliverables.

## 6. Tonight's rehearsal

| Member | Preparation task | Concrete output |
|---|---|---|
| Ganavi | Run app; rehearse opening/UI/integration; download video; check PR/Actions links | Working demo laptop, evaluation tabs and final checklist |
| Devopam | Trace one deposit/withdrawal through C++/SQL; rerun core/PostgreSQL checks | Explain integer paise, minimum rules, row locks and rollback with an actual example |
| Deepthi | Verify login/logout/lockout/ownership; rehearse account opening/update/closure | Explain security and lifecycle from API to tables |
| Divyanshi | Independently walk UI; inspect actual test outputs and video; review architecture mapping | Cross-module QA notes, playback confirmation and limitations list |

Do not put real credentials on a projector. Prepare fictional accounts before your slot. Keep the normal localhost:3000 server running, the video downloaded, and the GitHub pages loaded. No internet is needed to play the downloaded video or run the local app after dependencies are installed.

## 7. Evaluation-day checklist

- [ ] All four members are physically present during fourth hour.
- [ ] Confirm actual classroom/time and keep the demo laptop charged.
- [ ] Open app and confirm admin login works before the evaluator arrives.
- [ ] Have a fictional customer and known starting balance prepared.
- [ ] Keep submitted SRS/SAD/STP and architecture diagram accessible.
- [ ] Sprint-1 issue assignees verified their acceptance criteria and updated the tracker truthfully.
- [ ] Real teammate review evidence is present; do not claim missing reviews.
- [ ] Open merged PR #13 and a successful main Actions run.
- [ ] Download and play all 60 seconds of the committed demo video once.
- [ ] Each member can explain their preparation sheet without reading source verbatim.
- [ ] Disclose architecture deviations, local-only hosting, no real payouts and pending independent acceptance work.

## 8. What to say at the start

“We are Team 6. Our Sprint 1 backlog covers architecture, the database foundation, authentication, account management, the web interface and integration. We implemented the SAD's layered Express/C++ design with PostgreSQL. We will show a real customer transaction flow, the merged PR and automated checks, then explain each member's assigned area. Our issue acceptance and review evidence are shown separately from implementation status.”

Use the wording only after checking it against the actual current evidence. No script replaces understanding the system.
