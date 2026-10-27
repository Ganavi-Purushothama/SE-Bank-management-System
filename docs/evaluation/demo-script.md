# One-minute demo — playback, narration and backup

Video: [sprint1-demo.webm](sprint1-demo.webm). **Exactly 60.00 seconds**, VP9 WebM, 1280×900 at 25 fps, approximately 1.1 MB. It is a real browser recording with readable captions and **no audio**. You may play it silently, narrate live, or record your own voices separately after reviewing the script. Do not claim generated captions are the team speaking.

The recording uses the actual app, compiled C++ executable and real PostgreSQL in a unique disposable `demo_*` schema. It creates only fictional users/accounts there, verifies the displayed balances and rejection, then drops that schema. It does not use the normal project's customer tables, show passwords, or simulate banking success responses. Authentication is performed through the real API before the relevant recorded screen so credentials never appear.

## Timeline

| Approximate time | What the viewer sees | Point to explain |
|---|---|---|
| 00–07 | Customer dashboard, ₹1,000 opening balance; title/architecture caption | Team 6, Sprint 1, actual layered app and fictional data |
| 07–16 | Deposit ₹250.55 and review/confirmation | Connected form, validation and important-action confirmation |
| 16–22 | Committed balance ₹1,250.55 | C++ decision and atomic SQL balance/ledger commit |
| 22–32 | Withdrawal ₹50.55; resulting ₹1,200 | Server-authoritative integer-paise calculation |
| 32–39 | Attempt ₹1,200.01; insufficient-funds rejection | No incorrect balance mutation or success ledger entry |
| 39–46 | Mini-statement with OPENING, DEPOSIT and WITHDRAW | Persisted history; #9 is a Sprint-2 item already integrated |
| 46–53 | Administrator account directory | Distinct role-protected workspace and account information |
| 53–60 | Administrator details/history and evidence caption | Same ₹1,200 balance; PR #13/Actions/tests evidence linked in the guide |

Scene timing is a guide; playback has a short initial navigation interval. Final output is trimmed to exactly 60 seconds. No account-closing or lockout sequence fits this clip; show them live if asked. A UI control shown in the admin view is not evidence that its entire workflow appears in this video.

## Optional four-person live narration

These are preparation prompts, not claims of independent authorship. Speak naturally; approximately 120 words total fits one minute at a calm pace. If all four speak, hand over at roughly 15-second intervals.

**Ganavi, 00–15:** “We are Team 6. Our banking system connects a JavaScript web interface to Express, a C++ rules engine and PostgreSQL. This fictional customer starts with one thousand rupees and reviews a deposit.”

**Devopam, 15–30:** “The deposit adds two hundred fifty rupees and fifty-five paise. C++ validates integer-paise calculations. PostgreSQL commits the balance and ledger together. Withdrawing fifty rupees and fifty-five paise leaves twelve hundred rupees.”

**Deepthi, 30–45:** “An excessive withdrawal is rejected without changing the balance. Server-side authentication, ownership checks and role permissions protect account access. The mini-statement shows the persisted opening, deposit and withdrawal entries.”

**Divyanshi, 45–60:** “The administrator has a separate protected workspace. The repository includes the merged implementation PR, passing GitHub Actions and automated API, PostgreSQL and browser tests. Our guide maps these results to the submitted requirements and documents remaining limitations.”

Try the narration once with a timer. You can shorten a sentence to match your pace; do not accelerate so much that the evaluator cannot follow. Details such as lockout, session expiry and concurrency belong in the subsequent explanation, not a rushed one-minute clip.

## Re-recording

Prerequisites: `npm ci`, built C++ (`npm run build`), installed Playwright Chromium, the normal local project PostgreSQL database running, a valid local `.env`, and FFmpeg with VP9 encoding. The script does not record the normal localhost:3000 app session; it starts an isolated app on **127.0.0.1:4174** with its own generated schema.

```powershell
npm run local
```

Leave that terminal open. In a second terminal at the repository root:

```powershell
node scripts/record-sprint-demo.mjs
```

The script detects the Playwright FFmpeg path used on this Windows setup. On another machine set FFMPEG_PATH to your FFmpeg executable. It supports only a localhost database for recording. It creates a unique schema, not a new account in the ordinary public schema. Generated raw recordings remain ignored under `build/demo-raw`; the final public video is deliberately written to `docs/evaluation/sprint1-demo.webm`.

Do not record a real customer's information, project passwords, `.env`, `data/local-login.txt`, saved-browser passwords or a terminal command containing credentials. Replacing the final video should be a deliberate reviewed change; all media must remain fictional-data-only.

## Live demo backup

1. Before evaluation create a fictional ₹1,000 account as admin. Keep its generated number/password private.
2. Sign in as customer before projecting. Show overview → deposit ₹250.55 → withdraw ₹50.55 → balance ₹1,200.
3. Try ₹1,200.01; show clear rejection. Open history and identify the three committed entries.
4. Sign out. Sign in as admin without revealing the password; show directory/details.
5. Show PR #13, current real peer reviews and a successful Actions run.

If the network is unavailable, play the downloaded video and use the already-running local app. GitHub pages require connectivity unless already cached. If the normal app is not running, `npm run local` starts both project DB and server; allow for C++ compilation before your slot.
