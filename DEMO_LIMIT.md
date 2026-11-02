# Public demo AI allowance

Orbit permits **25 paid AI actions per visitor in a six-hour window**, shared across paid routes. The window begins with the first accepted action and expires in Redis; blocked requests do not extend it. Navigation, saved lessons/conversations/images, local preferences, mastery scoring, Calendar, Library and local persistence do not use this allowance.

**Deployment prerequisite:** configure the store and secrets below before deploying this change. Missing configuration or an unavailable store prevents paid calls with a safe `503` response. This implementation has not provisioned a store or changed the live deployment.

## Deployment configuration

Use one dedicated Upstash Redis database, available through Vercel Marketplace, with **eviction disabled**. All production functions/regions/aliases must use the same database and secret. Use separate credentials/secret for Preview; do not connect unrelated projects to this namespace. The implementation uses Redis REST directly, without a new package dependency.

Set these **server-only** environment variables in Vercel for Production and Preview:

| Variable | Purpose |
| --- | --- |
| `MODEL_API_KEY` | Existing Meta provider credential |
| `UPSTASH_REDIS_REST_URL` | HTTPS REST endpoint for the Redis database |
| `UPSTASH_REDIS_REST_TOKEN` | Redis write credential, with permission to run the limiter's Lua scripts |
| `DEMO_RATE_LIMIT_SECRET` | A separate, securely generated secret with at least 32 characters, used to HMAC visitor and image identities |

Store credentials as secrets. Never use a `VITE_` prefix, client code, query strings or browser storage for them. Configure variables before creating a new deployment. Rotating the HMAC secret changes counter identities and starts new allowances; coordinate rotation deliberately. There is no owner/admin bypass.

## Enforcement and data

`api/_lib/demoRateLimit.js` owns the policy constants, visitor identity, atomic reservation and safe errors. Each route validates before checking the allowance, and checks before calling Meta or starting a stream. Provider attempts remain counted even if they later fail or are cancelled, because they can incur cost. Invalid requests rejected before that boundary and missing provider credentials do not spend an action.

On Vercel, identity comes exclusively from the platform's `x-vercel-forwarded-for` header. Off Vercel, a protected server uses the direct socket address, not arbitrary forwarding headers. Missing/invalid identity fails closed. IPv6 text is canonicalized. The IP is HMAC-hashed before storage and is never returned or logged. Hosts, request bodies, cookies, browser resets and deployment IDs cannot create new buckets. A shared public IP shares an allowance; changing networks/IPs can obtain a different allowance. This is anonymous demo protection, not an account-based or project-wide spending cap.

Redis holds only expiring HMAC keys and integer counters, not raw IPs, lessons, PDFs, transcripts or learner profiles. Action records expire after six hours. Image allowances expire after ten minutes. Each reservation/claim uses one Lua `EVAL`, avoiding read/increment races between serverless instances. The REST call has a three-second timeout and never follows redirects or falls back to process memory. Store failures, invalid responses, missing secrets and unknown runtime environments stop paid work. No schema migration, historical migration edit or manual SQL is required; learner persistence remains browser-local.

Vercel's [WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) and [rate-limiting SDK](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk) use regional counters, so they do not give this application a single shared six-hour action budget. A shared [Redis REST](https://upstash.com/docs/redis/features/restapi) store also supports the one-time image allowance. The tradeoff is one store request per paid attempt, store availability becoming a prerequisite for AI, and normal Redis replication/failover limitations. Upstash documents [eventual consistency and failover](https://upstash.com/docs/redis/features/consistency); the application performs its counter read and write together in a mutating Lua script, not separate replica reads. Eviction, flushing the database or losing stored counters can reset allowances. No firewall configuration was changed.

## Paid route audit and output ceilings

All eight current public routes can call a paid provider, and all eight are protected. There are no current non-paid public API handlers to wrap.

| Route | Counted action | Provider output ceiling |
| --- | --- | --- |
| `generate-study-lesson` | Start/next lesson, simpler explanation, worked example | 6,000 output tokens |
| `generate-study-question` | New quiz question | 3,000 |
| `evaluate-study-answer` | Corrective explanation and follow-up question | 4,000 |
| `respond-to-study-message` | One Talk It Through reply, JSON or streaming | 4,000 |
| `study-activity` | Generate an activity or evaluate an attempt | 4,000 |
| `analyze-course` | Analyze one PDF | 12,000 |
| `recommend-course` | Explicit model-based recommendation (Home opening uses local suggestions) | 2,000 |
| `generate-lesson-image` | Separate Show me/retry/direct image request; included automatic images as below | Existing `n: 1`, `1536x1024` size hint, WEBP URL output, tools disabled |

All seven text routes now set `max_output_tokens` from `api/_lib/modelLimits.js`. These budgets include [Muse's reasoning and visible output](https://dev.meta.ai/docs/reasoning), leaving room for complete JSON and visual metadata. Existing short lesson/conversation/activity validations and prompts remain intact. Image generation retains its existing request size bound, single image configuration and timeout; no unsupported token parameter was added to the image endpoint.

After validated lesson/next/simplify output or a completed conversation reply includes an image brief, the server records one included image allowance, bound to that visitor and the exact normalized image request. The image route atomically consumes it before considering a new public action. This works even when the parent was action 25. Concurrent replays cannot consume the same allowance twice; a different visitor or modified context cannot use it. The client sends no exemption token or trusted flag. Example output does not currently auto-load images, so it receives no allowance. Separate Show me and retries without an unused matching allowance count as new actions; expired allowances also require a new action. If recording an allowance fails, the successful text is returned without the automatic image brief, preventing an accidental extra charge for that failure. Existing image caching and restore behavior are unchanged.

## User experience and development

Exhaustion returns `429`, `error: "demo_limit_reached"`, a safe message, `Retry-After` and `retryAfterSeconds`. `src/services/demoUsage.js` recognizes that code before parsing JSON or streaming content. An accessible shell notice says:

> You've reached the AI limit for Orbit's public demo. You can still explore the app or watch the full demo.

It links to [Watch the full demo](https://youtu.be/-xQGO-GYUVg). Inline Study/upload errors use the same friendly wording. Known exhaustion suppresses further paid client requests until the supplied retry time; an already-included automatic image may still finish through the server check. Navigation and existing content remain available. This temporary in-memory UI state is only a convenience; refreshing cannot bypass the backend. Provider-originated `429` responses without the demo identifier do not set this state.

Local development bypasses the limiter only with explicit `NODE_ENV=development` or `test` and no deployed Production/Preview/custom-environment markers. `vercel dev` with `VERCEL_ENV=development` is supported; use `npm run dev:api` for the full local runtime. The provider key is still required and local AI calls can still incur provider charges. A deployed environment stays protected even if `NODE_ENV` is incorrectly set to development/test. No production-disable environment variable exists.

`npm test` preloads `tests/fixtures/testEnvironment.js` to set an explicit local test environment, a dummy provider credential and a guard against unmocked paid-provider fetches. New limiter tests explicitly exercise production/preview behavior using fakes. Run focused tests with:

```sh
node --import ./tests/fixtures/testEnvironment.js --test tests/demo-rate-limit.test.js tests/demo-usage-ui.test.js
```

## Verification before release

Automated tests use fake Redis/provider responses and mounted Happy DOM components. They do not execute against a real Redis server, spend AI credits or verify the live Vercel configuration. Before release:

1. Confirm the four private environment variables, a shared production store with eviction disabled, and separate Preview configuration. With the store missing/unreachable, verify an AI action returns the temporary-unavailable message while navigation still works.
2. In a controlled Preview environment, verify requests through Vercel identify one visitor consistently across routes and aliases. Confirm allowance 25 succeeds and 26 returns the demo identifier without another provider invocation. Prefer a provider stub for boundary checks; live AI attempts cost credits.
3. Verify one new lesson and its automatic image use one action, a separate Show me/retry uses a new action, and saved lessons/images do not invoke the provider on navigation or reload. Verify streamed exhaustion returns JSON before any text is streamed.
4. Check the message, video link, retained lesson, draft recovery, Home/Learn/Calendar/Library navigation, and expiry recovery on desktop and a narrow mobile viewport. Check keyboard and screen-reader access to the notice/link. Live provider quality under the new ceilings and actual Redis expiry/failover remain deployment checks.
