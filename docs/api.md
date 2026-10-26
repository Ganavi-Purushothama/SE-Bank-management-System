# API reference

The frontend and API share one origin. JSON responses use `{status:"OK",data:...}` or `{status:"APPROVED",data:...}`; failures use `{status:"REJECTED",reason,requestId?}`. Dates are ISO timestamps. Money in responses is **integer paise**, currency INR; write amounts are decimal **strings in rupees**, e.g. `"250.55"`. Never send floating-point monetary JSON numbers. Generated account IDs are UUIDs; login uses the separate generated account number. No caller can set a stored balance, role, or owner.

All POST/PATCH calls require `Content-Type: application/json` and an `Origin` exactly matching `APP_ORIGIN`. Authenticated writes also require the `X-CSRF-Token` returned by login or `/api/me`. Browsers handle the HttpOnly session cookie; command-line clients must maintain their own cookie jar. GET responses containing account data have `Cache-Control: no-store`. CORS is intentionally not enabled: a cross-origin frontend is unsupported.

| Method / path | Access | Input | Successful result |
|---|---|---|---|
| GET `/api/health` | Public | none | `200 {status:"OK"}` after database query |
| GET `/api/config` | Public | none | `200 data: {minInitial,minBalance,currency}` |
| POST `/api/login` | Public, rate-limited | `{accountNumber,password}`; accountNumber may be admin login | `200 data: {role,csrfToken}` and new session cookie |
| GET `/api/me` | Signed in | none | `200 data: {role,csrfToken,accounts:[]}`; admin has no personal account |
| POST `/api/logout` | Signed in + CSRF | `{}` | `200`; database session revoked and cookie cleared |
| GET `/api/accounts/:id` | Owner or admin | UUID | `200 data:` account details and balance |
| PATCH `/api/accounts/:id` | Owner or admin + CSRF | `{name,phone,address}` | `200 data:` updated account; ACTIVE accounts only |
| POST `/api/accounts/:id/deposit` | Customer owner + CSRF | `{amount:"10.25"}`; required `Idempotency-Key` header | `200 APPROVED data: {transactionId,newBalance,replayed}` |
| POST `/api/accounts/:id/withdraw` | Customer owner + CSRF | same as deposit | same response |
| GET `/api/accounts/:id/transactions` | Owner or admin | optional query `page`, `type`, `from`, `to` | `200 data: {items,page,total,pageSize:20}` |
| GET `/api/admin/accounts` | Admin | optional `search`, `page` | `200 data: {items,page,total,pageSize:20}`, includes access lock flag |
| POST `/api/admin/accounts` | Admin + CSRF | `{name,phone?,address?,password,initialDeposit:"500.00"}` | `201 data:` new account and generated number |
| POST `/api/admin/accounts/:id/unlock` | Admin + CSRF | `{}` | `200`; resets failed login count and lock flag |
| POST `/api/admin/accounts/:id/close` | Admin + CSRF | `{confirmAccountNumber:"..."}` | `200 data: {settledAmount,currency}`; records full settlement and closes atomically |
| GET `/api/admin/audit` | Admin | optional `page` | `200 data: {items,page,total,pageSize:20}` |

Account data: `id,number,name,phone,address,type,balance,status,created_at,closed_at,currency`. Account type is SAVINGS. Status is ACTIVE or CLOSED. Transaction items: `id,type,amount,balance_after,created_at,status:"COMMITTED"`. Types: OPENING, DEPOSIT, WITHDRAW, SETTLEMENT. No failed operation is represented as a committed transaction. Audit items contain event, time and internal actor/account references, never passwords or session tokens.

## Validation and errors

`400`: malformed body/JSON, unexpected fields, invalid identifiers, amounts, page/date/type, missing idempotency key, confirmation mismatch. `401`: invalid login, locked/closed login (same generic error), missing/expired/revoked session. `403`: disallowed origin, missing/incorrect CSRF token, incorrect role. `404`: nonexistent or non-owned account, unknown endpoint. `409`: closed state or reused idempotency key with a different amount/operation; unique identifier conflict. `413`: body above 8 KB. `415`: wrong content type. `422`: C++ rejects initial minimum, insufficient funds, retained minimum, or maximum balance. `429`: more than 30 login requests per IP in 15 minutes. `500`: database/internal error (generic message). `503`: missing, timed out, or malformed-response C++ engine. A database commit error never produces an APPROVED response.

Names: trimmed, nonempty, maximum 100 characters. Phone: up to 30; address: up to 300. No control characters. Password: minimum 12 characters, maximum 128 UTF-8 bytes. Admin login: 1–32 alphanumeric/hyphen characters. Customer account numbers are generated server-side and constrained unique. Amount strings: positive, no sign/exponent/leading zeroes except `0.xx`, maximum two decimals and 9,000,000,000,000 paise. UUID and page parameters are validated. Transaction filters use inclusive `from` and `to` YYYY-MM-DD **UTC** dates, newest first, 20 per page. `type` is one of the four ledger types. Search treats `%` and `_` as literal characters and uses parameterized queries.

## Financial retries

Generate one 16–100 character alphanumeric/hyphen/underscore `Idempotency-Key` for each intended deposit/withdrawal (UUID works). Retry the same account, operation, amount and key after a timeout. The stored response balance represents the original transaction, not necessarily the current balance; refresh account details for today's balance. A reused key with a different amount or operation is rejected. Account-row locking makes concurrent duplicate submissions return the same committed transaction. The UI retains this key for the same amount/operation while the page remains open. After a reload, inspect history before retrying an uncertain submission. Opening/closure are not exposed as generic financial retry APIs; closed accounts reject repeated closure.

## C++ IPC version 1

Backend spawns `build/bank-core[.exe]` with no shell and no command arguments. Stdin is a single newline-terminated canonical JSON object, exact field order and no spaces:

```json
{"operation":"WITHDRAW","currentBalance":100000,"amount":25000,"minBalance":0}
```

Every numeric value is integer paise, never rupees. Output is either `{"status":"APPROVED","newBalance":75000}` or `{"status":"REJECTED","reason":"Insufficient available funds"}`. Engine supports OPENING/DEPOSIT/WITHDRAW/SETTLEMENT, validates bounds and operation, and has no SQL/HTTP/auth responsibilities. Input is bounded to 512 bytes, output to 1024, execution to two seconds. Unsupported or malformed input is rejected. The strict canonical JSON grammar is intentional; this executable is called only by the adapter, not directly by browsers.
