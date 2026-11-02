# Public demo AI allowance

Orbit checks two allowances before starting a new paid action. Both must have room. Navigation, saved lessons/conversations/images, local preferences, mastery scoring, Calendar, Library and local persistence do not use either allowance.

### Visitor allowance

**25 paid AI actions per visitor per six hours**, shared across paid routes. This existing window begins with the visitor's first accepted action and expires in Redis; blocked requests do not extend it.

### Global emergency ceiling

**750 paid AI actions across the public deployment per rolling 24 hours.** Each accepted action leaves the global window exactly 24 hours after its reservation. This is not a calendar-day reset or a 24-hour window anchored to the first action. The ceiling protects against unexpected aggregate traffic or deliberate visitor-limit evasion. All production visitors, routes, function instances, regions and aliases share it; Preview uses its own environment/store as described below.

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

Store credentials as secrets. Never use a `VITE_` prefix, client code, query strings or browser storage for them. Configure variables before creating a new deployment. Rotating the HMAC secret changes visitor/image identities and starts new visitor allowances, but does not reset the global ceiling. Coordinate rotation deliberately. There is no owner/admin bypass. No additional environment variable, dependency or service is required for the global ceiling.

## Enforcement and data

`api/_lib/demoRateLimit.js` owns the policy constants, visitor identity, atomic reservation and safe errors. Each route validates before checking the allowance, and checks before calling Meta or starting a stream. Provider attempts remain counted even if they later fail or are cancelled, because they can incur cost. Invalid requests rejected before that boundary and missing provider credentials do not spend an action.

On Vercel, identity comes exclusively from the platform's `x-vercel-forwarded-for` header. Off Vercel, a protected server uses the direct socket address, not arbitrary forwarding headers. Missing/invalid identity fails closed. IPv6 text is canonicalized. The IP is HMAC-hashed before storage and is never returned or logged. Hosts, request bodies, cookies, browser resets and deployment IDs cannot create new buckets. A shared public IP shares a visitor allowance; changing networks/IPs can obtain a different visitor allowance but remains subject to the same global ceiling. These are action ceilings, not a currency-denominated spending cap.

Redis holds expiring HMAC visitor/image keys and integer counters, plus a bounded global sorted set of reservation timestamps and random server-generated IDs. The global set contains no visitor identifiers or learning data and keeps at most 750 live entries. Visitor counters expire after six hours and image allowances after ten minutes; global entries age out individually after 24 hours, and the whole global key expires after 24 hours of inactivity. No raw IPs, lessons, PDFs, transcripts or learner profiles are stored.

Each reservation/claim uses the existing single Lua `EVAL`. It first consumes a matching included-image allowance without debiting either quota. Otherwise it checks the visitor's allowance, uses Redis `TIME` to remove expired global entries, and checks the global count. Only after BOTH checks pass does it append one unique global record and increment/create the visitor counter. Visitor rejection never adds global usage; global rejection never increments/creates a visitor counter or extends its expiry. If both limits apply, visitor exhaustion retains priority. Global `Retry-After` is calculated from the oldest live reservation, so capacity reopens as actions age out. Constants for both limits/windows remain in `api/_lib/demoRateLimit.js`.

Existing visitor/image key names are unchanged, and the global key is shared per environment independently of the HMAC secret, hostname or deployment ID. The script uses Upstash's documented [default Lua locking](https://upstash.com/docs/redis/features/key-locking) across all declared keys. Keep the dedicated Upstash store: ordinary sharded Redis Cluster services may reject this multi-key operation across hash slots and are not a drop-in replacement. Global history begins when this version is deployed; older actions have no per-action timestamps to backfill. Retire public deployments running older limiter code so they cannot accept uncounted work. No schema migration, historical migration edit or manual SQL is required; learner persistence remains browser-local.

The REST call retains its three-second timeout and never follows redirects or falls back to process memory. Store failures, invalid responses, missing secrets and unknown runtime environments stop paid work. Successful reservations remain counted if the provider later fails or a response is lost. A timeout after Redis commits can conservatively reserve an action without starting a provider call; there is no blind retry/refund that might undercount paid work. Lua isolation prevents concurrent interleaving but is not rollback on unexpected command/storage failures, so infrastructure errors can leave conservative overcounting. No noisy logging was added; helper denial results distinguish `visitor_limit`, `global_capacity` and `unavailable` internally.

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

After validated lesson/next/simplify output or a completed conversation reply includes an image brief, the server records one included image allowance, bound to that visitor and the exact normalized image request. The image route atomically consumes it before considering a new public action. The parent and its automatic image use **one visitor action and one global action**, including when the parent was visitor action 25 or global action 750. Concurrent replays cannot consume the same allowance twice; a different visitor or modified context cannot use it. The client sends no exemption token or trusted flag. Example output does not currently auto-load images, so it receives no allowance. Separate Show me and retries without an unused matching allowance count once against each quota; expired allowances also require a new action. If recording an allowance fails, the successful text is returned without the automatic image brief, preventing an accidental extra charge for that failure. Existing image caching and restore behavior are unchanged.

## User experience and development

Visitor exhaustion returns `429` with `error: "demo_limit_reached"`; global exhaustion returns `429` with `error: "demo_capacity_reached"`. Both include a safe message, `Retry-After` and `retryAfterSeconds`, without counts or infrastructure details. `src/services/demoUsage.js` recognizes either code before parsing JSON or streaming content. The visitor notice remains:

> You've reached the AI limit for Orbit's public demo. You can still explore the app or watch the full demo.

The global capacity notice says:

> Orbit's public demo has reached its current AI capacity. You can still explore the app or watch the full demo.

It links to [Watch the full demo](https://youtu.be/-xQGO-GYUVg). Inline Study/upload errors use the same friendly wording. Known exhaustion suppresses further paid client requests until the supplied retry time; an already-included automatic image may still finish through the server check. Navigation and existing content remain available. This temporary in-memory UI state is only a convenience; refreshing cannot bypass the backend. Provider-originated `429` responses without the demo identifier do not set this state.

Local development bypasses the limiter only with explicit `NODE_ENV=development` or `test` and no deployed Production/Preview/custom-environment markers. `vercel dev` with `VERCEL_ENV=development` is supported; use `npm run dev:api` for the full local runtime. The provider key is still required and local AI calls can still incur provider charges. A deployed environment stays protected even if `NODE_ENV` is incorrectly set to development/test. No production-disable environment variable exists.

`npm test` preloads `tests/fixtures/testEnvironment.js` to set an explicit local test environment, a dummy provider credential and a guard against unmocked paid-provider fetches. New limiter tests explicitly exercise production/preview behavior using fakes. Run focused tests with:

```sh
node --import ./tests/fixtures/testEnvironment.js --test tests/demo-rate-limit.test.js tests/demo-usage-ui.test.js
```

## Verification before release

Automated tests use fake Redis/provider responses and mounted Happy DOM components. They do not execute against a real Redis server, spend AI credits or verify the live Vercel configuration. Before release:

1. Confirm the four private environment variables, a shared production store with eviction disabled, and separate Preview configuration. With the store missing/unreachable, verify an AI action returns the temporary-unavailable message while navigation still works.
2. In a controlled Preview environment with a provider stub, verify requests through Vercel identify one visitor consistently across routes and aliases. Confirm visitor action 25 succeeds and 26 returns `demo_limit_reached`. Across multiple simulated visitors, confirm global action 750 succeeds and 751 returns `demo_capacity_reached` without a provider call or visitor debit. Live AI attempts cost credits.
3. Verify one new lesson and its automatic image use one action in BOTH quotas even at global capacity, a separate Show me/retry uses a new action in both, and saved lessons/images do not invoke the provider on navigation or reload. Verify streamed exhaustion returns JSON before any text is streamed. Check staggered global expiry so only actions older than 24 hours stop counting.
4. Check both messages, video link, retained lesson, draft recovery, Home/Learn/Calendar/Library navigation, and expiry recovery on desktop and a narrow mobile viewport. Check keyboard and screen-reader access to the notice/link. Live provider quality under the existing ceilings and actual Redis expiry/failover remain deployment checks.

## Investigating generic Example / Next failures

Local investigation on November 1, 2026, against commit `718dbc2`: the reported production incident is **not diagnosed or fixed**. Vercel metadata requests returned a team-access `403`; investigation then continued locally at the user's request. That authorization failure is from the management API, not the Study endpoint. The tester's exact HTTP response, deployed commit and whether their request reached Meta remain unknown. Do not infer a limiter or provider failure from the screenshot alone.

Both paths were exercised locally through the actual code: `generateStudyExample` / `generateNextStudyLesson` -> `requestStudyLesson` -> `/api/generate-study-lesson` -> `enforceDemoRateLimit` -> mocked Redis/Meta -> `demoAiFetch` -> mounted Study. The mocks replace external services; they do not execute Lua or prove deployment configuration.

| Tested condition, for both actions | HTTP status and safe response body | Meta called in test? | Study behavior |
| --- | --- | --- | --- |
| Visitor allowance exhausted | `429`, `error: "demo_limit_reached"`, retry metadata | No | Dedicated visitor-limit message |
| Global capacity exhausted | `429`, `error: "demo_capacity_reached"`, retry metadata | No | Dedicated capacity message |
| Missing configuration, invalid identity, rejected/failed Redis request or malformed EVAL result | `503`, `error: "demo_temporarily_unavailable"`, safe unavailable message | No | Dedicated unavailable message |
| Provider returns 429 | `429`, `error: "Failed to generate study lesson"` | Yes, mocked | Existing generic action error; no demo restriction |
| Provider returns 500 | `500`, `error: "Failed to generate study lesson"` | Yes, mocked | Existing generic action error |
| Missing/malformed provider output | `502`, `error: "Failed to generate study lesson"` | Yes, mocked | Existing generic action error |
| Lesson output fails validation | `502`, `error: "Invalid study lesson response"` | Yes, mocked | Existing generic action error |
| Non-JSON platform 503, injected at the client boundary | `503`, plain-text body | Not established by this simulation | Existing generic action error |

`demoAiFetch` throws recognized demo codes before `requestStudyLesson` reaches its `!response.ok` branch. The latter therefore does not replace these errors. The mounted tests confirm the correct message and unchanged saved lesson, learning path and mastery for both actions. Genuine unrelated failures remain generic. No runtime, UI, prompt, token ceiling or quota change was justified by these local results. The initial limiter commit also introduced a 6,000-token lesson output ceiling; exhaustion of that ceiling is a possible cause of incomplete provider output, not an established cause of this incident.

Production configuration audit remains open:

| Required variable | Production / Preview presence and scope | Included in the active deployment? |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Unverified | Unverified |
| `UPSTASH_REDIS_REST_TOKEN` | Unverified | Unverified |
| `DEMO_RATE_LIMIT_SECRET` | Unverified | Unverified |
| `MODEL_API_KEY` | Unverified | Unverified |

Redis provisioning, actual token permissions, acceptance of the current multi-key EVAL, and deployment creation time relative to environment changes are also unverified. Local tests prove that failures stop paid work; they do not establish whether any of these conditions exists in production. No environment changes or redeployment were made, and no specific environment repair is established.

Synthetic Production and Preview requests accept single IPv4 and IPv6 strings (including surrounding whitespace and equivalent IPv6 spellings). Missing, comma-separated, array, bracketed or port-bearing values are rejected with the structured unavailable response before Redis. Generic forwarded headers and socket addresses cannot substitute for an invalid Vercel identity. A chain would be rejected by `isIP(value.trim())`; whether Vercel actually supplied one in the failing request is unknown. Do not add a fallback to untrusted headers without evidence.

To finish the production investigation:

1. Check the four variables in Vercel's project settings for the correct Production/Preview targets, a valid HTTPS REST URL, a sufficiently long identity secret and the intended Redis database. Compare their modification times with the active deployment's creation time and commit. Environment corrections require a new deployment; tests-only changes do not repair a deployed failure. Keep all values private.
2. In the browser Network panel, preserve the log and attempt Example once and Next once. Record the deployment, timestamp, action, HTTP status, safe error body and request correlation ID. Do not share a HAR containing request payloads, cookies, headers or learner data. Match the status/body to the table above; a provider-originated 429 is not a demo quota rejection.
3. Correlate those requests with Vercel function logs and provider request evidence. A `502` with the generic body can represent multiple parsing/transport failures and does not by itself identify the cause. Check incomplete output and output-validation failures without logging prompts or response content. Confirm whether Meta was called instead of inferring this from the UI.
4. Check Upstash provisioning, command errors and write/EVAL permissions. Exercise the exported Lua scripts against isolated test keys in a controlled Preview database, including the three-key reservation and image grant. Do not reset production counters or probe through hundreds of paid AI calls.
5. Inspect the header **received by the function**, separately in Production/Preview and over IPv4/IPv6. Record only its classification (missing, single IPv4, single IPv6, chain or invalid), never the address. The browser's outgoing headers cannot establish what Vercel injected. Preserve fail-closed behavior while investigating.
6. After any evidence-backed repair and redeployment, confirm both actions, the dedicated messages under controlled blocked states, retained lesson/progress, and zero provider calls for blocked requests. Check a freshly loaded client as well as an already-open tab to identify version skew.
