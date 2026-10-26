# Security review

This is an academic implementation, not a security certification. Review covers application code, dependency audit and automated security/financial tests. Original artifacts contained no implementation to assess; no secrets were identified in the inspected source documents. No history-wide credential scanner or independent penetration test has been performed.

## Implemented controls

- Node scrypt (N=32768, r=8, p=1), independent random salts, constant-time hash comparison; password hashes never returned or logged. Unknown users still execute a dummy password hash verification.
- Generic 401 login errors for unknown, incorrect, closed or locked accounts; persistent lock after three failures, admin-only customer unlock, revoke all existing sessions on lock.
- 256-bit random opaque session IDs, SHA-256 storage, independent CSRF tokens, absolute expiration, session rotation on login, persisted revocation on logout/closure, HttpOnly/SameSite=Strict cookies. Production adds Secure and `__Host-` cookie naming.
- Server ownership checks on all account reads/writes/history; missing and non-owned accounts both produce 404. Admin routes independently enforce role. Admins cannot use customer deposit/withdraw routes.
- Exact Origin checks on all writes (including login), CSRF tokens on authenticated writes, same-origin hosting with no permissive CORS, Helmet/CSP headers, escaped UI output, no inline scripts or external frontend resources.
- Parameterized SQL, UUID/type/date/page validation, field allowlists rejecting mass assignment, 8 KB body limit, positive fixed-precision amount parser, bounds on stored values and C++ calculations.
- Per-account `FOR UPDATE` locks, atomic balance/ledger commits, persisted retry keys, rollback on engine/DB failures, settled closure with retained audit/ledger. C++ runs without a shell, with bounded input/output and two-second timeout.
- Login limiter: 30/IP/15 minutes; audit events for credential failures, lockouts, creation, contact updates, closure and unlocking. Structured server error logs contain request IDs/event/error code, not SQL or credentials.
- Real `.env`, generated binaries, database clusters and test outputs are ignored. `.env.example` has placeholders only. No default admin is provisioned; test accounts are fictional and isolated.

## Findings and residual risks

| Severity | Finding / impact | Safe reproduction / evidence | Remediation / current status |
|---|---|---|---|
| High if publicly exposed over HTTP | Credentials/session traffic would be observable | Development intentionally supports HTTP on loopback | Production config rejects HTTP APP_ORIGIN and sends Secure cookies; deploy behind actual HTTPS proxy. Public hosting/TLS not provisioned or tested. |
| Medium | Permanent account lock allows intentional denial of service to a known account | Three wrong passwords, then correct credentials fail until admin unlock | Required by SR-003; persisted audit and IP limiting implemented. Operational identity verification and recovery process needed for real use. |
| Medium | Admin has broad access and can authorize settlements; no MFA, dual control or external payout reconciliation | An authenticated admin can close an active account after account-number confirmation | Within documented academic scope. Add MFA/approval/reconciliation before any real-money adaptation. No real payout integration exists. |
| Medium | Rate limiter is in memory and per process; restart clears IP limits and shared proxies share a limit | Restart process resets rate-limit store, not persisted account lock | Single-process local deployment only. Use a shared limiter and explicit trusted proxy configuration before horizontal scaling. |
| Medium | Financial retry key is retained by UI only in the current page memory | Reload after lost response, submit again: a fresh intended request receives a fresh key | Server safely deduplicates stable keys. UI warns to inspect history after reload. A durable pending-operation recovery flow is future work. |
| Medium | DB operators/app role can alter data outside service checks | Privileged SQL can update accounts directly | SRS assumes no out-of-band tampering. Restrict role/DB access, use backups and external immutable audit for production. Current audit is not tamper-evident. |
| Low | No password change/reset interface, session inventory, MFA or independent admin unlock UI | These operations have no endpoint | Not in SRS. Trusted operator can recover a specific admin after identity verification. No public recovery backdoor. |
| Low | Closure confirmation reflects a balance read when the dialog opens; a concurrent transaction can change final settlement | Admin opens confirmation while customer transacts | Closure uses and settles the locked current database balance. Admin must verify returned settledAmount; a versioned confirmation would improve the workflow. |
| Low | Process-per-operation C++ spawn and password hashing can consume resources under abuse | Repeated authenticated requests create C++ processes | Bounded IPC/timeouts, body limits and login throttling implemented; sustained hostile load and DDoS resilience not assessed. |

## Safe verification

`npm test` tests cross-account denial, wrong roles, injection payloads, mass assignment, CSRF/origin protection, lockout, expiry, logout, invalid amounts, idempotency and rollback. `npm run test:postgres` repeats the API suite on real PostgreSQL and exercises actual locks. `npm run test:e2e` checks customer/admin views and error handling. `npm audit` assesses the installed dependency graph; a clean audit does not prove absence of vulnerabilities.

If a real secret is ever added, revoke/rotate it at its provider and remove it from the working tree. Do not reproduce it in issues/logs. Removal from the current file alone does not revoke a leaked secret or remove Git history. No secret rotation or history rewrite was required or performed in this change.
