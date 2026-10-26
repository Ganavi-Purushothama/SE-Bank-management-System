# Sprint 1 evaluation kit — Team 6

**Evaluation: Tuesday, 27 October 2026, fourth teaching hour.** The announcement does not give a clock time; confirm the fourth-hour timetable with your class. Attendance is compulsory for **Ganavi, Devopam, Deepthi and Divyanshi**.

Start here:

1. [Evaluation guide and readiness checklist](sprint1-evaluation.md) — what is actually in Sprint 1, deliverables, GitHub evidence and remaining human actions.
2. [Complete system handoff](team-handoff.md) — architecture, every module/file, database, security, request flows and how the parts connect.
3. [Four individual preparation sheets](member-preparation.md) — ownership from the real backlog, what each person must understand, show, test and explain.
4. [One-minute demo video](sprint1-demo.webm) — real browser/API/C++/PostgreSQL workflow with fictional data, captions and no audio. Download the file if GitHub does not display a player.
5. [Demo timeline and narration](demo-script.md) — exact sequence, optional voiceover and a live-demo backup.

The roles below describe backlog responsibility and preparation, **not proof of individual authorship**. PR #13's three implementation commits are recorded under Ganavi's account. No teammate reviews were recorded on that PR when this kit was prepared. Do not claim four independent code authors or completed peer reviews unless GitHub actually records them.

## Run the application

For Ganavi's existing checkout:

```powershell
cd "D:\PES\SEM-5\SE\Jackfruit\SE-Bank-management-System"
npm run local
```

Leave that terminal open. Visit `http://localhost:3000`. Your local administrator credentials are in the ignored `data/local-login.txt`; do not include that file or its contents in the video, report or GitHub.

For another teammate: clone the repository, run `npm ci`, install Node 22.12+, G++ and PostgreSQL binaries, then follow the root README. The Windows local helper detects installed PostgreSQL binaries or accepts POSTGRES_BIN. Each teammate gets their own database and local login; there is no shared production password.

## What to have open before your turn

- Running banking app with one fictional customer account.
- This kit, submitted SRS/SAD/STP and UML diagrams.
- [Merged implementation PR #13](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/pull/13).
- A successful [main-branch Actions run](https://github.com/Ganavi-Purushothama/SE-Bank-management-System/actions/runs/40331522937).
- The downloaded 60-second video, playable offline.
- Actual teammate review evidence and current Sprint 1 issue statuses, checked before evaluation.

The evaluator's notice asks for completed Sprint 1 features, PRs/reviews/Actions, and a one-minute video uploaded to the repository. A merged PR and green Actions do **not** substitute for real peer review. The detailed checklist marks that gap explicitly.
