# MiniMax Production Observability

## Reporter

- Default sink: structured `console.error` JSON.
- Optional external sink: set `MINIMAX_TELEMETRY_WEBHOOK_URL` to receive the same redacted payload via `POST`.
- Sensitive values are redacted before emission: bearer tokens, `api_key`, `token`, `secret`, `authorization`, and similar key-like fields.

## Event Shape

Every MiniMax failure event emitted via `captureServerError` / `recordUploadFailure` includes these fields. `miniMaxMessage`, `upstreamStatus`, and `retryAfterSeconds` are **always present** (set to `null` when unknown) so downstream pipelines can rely on the shape without per-event branching.

- `timestamp`
- `service` = `minimax-api`
- `eventType` = `route_error` | `upload_failure` | `stream_failure` | `stream_stall` | `upstream_retry`
- `endpoint`
- `method`
- `operation`
- `statusCode`
- `miniMaxCode`
- `miniMaxMessage` (redacted, `null` when unknown)
- `upstreamStatus` (`null` when unknown)
- `retryAfterSeconds` (`null` when unknown)
- `attemptNumber` (present on `upstream_retry` events)
- `retryable`
- `errorName`
- `errorMessage` (redacted)
- `stack` (redacted when present)
- `redacted` = `true`

## Event Emitters

- `captureServerError(error, context)` — generic error sink for any route handler.
- `recordUploadFailure(error, context)` — convenience wrapper that pins `eventType: 'upload_failure'` and the upload endpoint defaults. Used by `POST /api/minimax/files/upload`.

## Starter Alert Thresholds

Tune these after real traffic, but start here:

- **MiniMax route errors**: warn at `>= 5` errors in 5 minutes, critical at `>= 15` in 5 minutes.
- **MiniMax 429s**: warn at `>= 10` in 10 minutes, critical at `>= 25` in 10 minutes.
- **MiniMax upstream 5xx / timeout failures**: warn at `>= 3` in 5 minutes, critical at `>= 8` in 5 minutes.
- **Upload failures**: warn when upload error rate exceeds `5%` over 15 minutes, critical at `10%`.
- **Streaming stalls / read failures**: warn at `>= 3` in 10 minutes, critical at `>= 8` in 10 minutes.

## Production Error-Rate Anchors

- **`> 1%` error rate**: on-call backend owner investigates within the active incident window, confirms whether failures are concentrated in `429`, `408`, or `5xx`, and checks the latest `upstream_retry` telemetry.
- **`> 2%` error rate**: treat as an emergency. Backend on-call owns the incident commander role, pulls in the product owner, and decides between rollback and fix-forward within the first response cycle.
- **`> 5%` error rate**: all hands for the owning team. Freeze risky deploys, assign one owner to mitigation and one to communications, and keep updating status until the error rate returns below emergency thresholds.

## Ownership and Mitigation Flow

1. **Backend on-call owns first response** for MiniMax production failures.
2. **Rollback first** when the error spike correlates with the latest deploy and the previous release is known-good.
3. **Fix forward** when the issue is isolated to upstream behavior, config, or a safe hotfix that is faster than rollback.
4. After mitigation, capture the cause, chosen rollback/fix-forward path, and any threshold changes in the incident notes.

## Operational Notes

- A `retryable: true` event means the caller can safely back off and retry.
- `retryAfterSeconds` should drive automated retry scheduling when present.
- `upstream_retry` fires on every bounded retry attempt with the upstream status, retry-after metadata, attempt number, and logical operation name.
- `stream_stall` means the upstream stream opened but stopped producing chunks before completion.

## Known Production Risk

- `pnpm audit --prod --audit-level high` still fails on stable `next@16.2.12` because Next bundles vulnerable `postcss@8.4.31` and `sharp@0.34.5` internally.
- This is an upstream release-owner decision: accept the risk temporarily or move to a patched Next release when one exists.
