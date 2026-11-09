# Orbit

**An adaptive AI learning companion that doesn't just learn what you know — it learns how to teach you.**

Built for the **2026 Meta AI Developer Hackathon**, Orbit helps learners understand difficult material, work through confusion, and decide what to learn next. It combines course context, recent learning, practice results, and learner feedback in one ongoing experience, powered by **Meta Muse Spark and Muse Image**.

**Learn → Practice → Evaluate → Adapt → Continue**

Start with a class, a PDF, or something you want to understand. Orbit teaches one useful idea, offers ways to explore it, and carries that context into the next step.

## Demo

[![Watch the Orbit demo on YouTube](https://img.youtube.com/vi/-xQGO-GYUVg/hqdefault.jpg)](https://youtu.be/-xQGO-GYUVg)

**[Watch the Orbit demo](https://youtu.be/-xQGO-GYUVg)**

[Product preview](#product-preview) · [Built with Meta AI](#built-with-meta-ai) · [Run locally](#running-locally)

## Why Orbit

A lecture, textbook, or video usually has to explain something one way to everyone. But learners do not all get stuck in the same place. Someone may need an example before a definition makes sense; someone else may understand the big picture but lose the thread halfway through an explanation.

Orbit is designed around the idea that learning should be able to change in response. Its value comes from connecting what someone is studying with how they respond: their questions, attempts, confusion, corrections, and useful earlier connections can influence both the next explanation and the next concept.

That also means helping with the effort around learning. Orbit is designed especially with attention, information overload, task initiation, and returning to unfinished work in mind. Short lesson chunks, one clear next action, optional practice, and return context help keep the work approachable. This includes many learners with ADHD, without assuming that everyone with ADHD has one universal learning style.

The goal is to make learning feel less like managing a school dashboard and more like having a companion that understands where you left off and can try another way when something is not clicking.

## How Orbit Learns With You

**Learn → Practice → Evaluate → Adapt → Continue**

| Step | What happens |
| --- | --- |
| **Learn** | Begin with a focused explanation informed by the topic, available course material, recent work, and teaching preferences. |
| **Practice** | Ask for an example, try a small applied activity, discuss a question, or choose a quiz. |
| **Evaluate** | Quiz answers and demonstrated understanding in activities gradually update the relevant topic's mastery estimate. |
| **Adapt** | Confusion can lead to a different explanation, a useful visual, or an easier follow-up question on the same concept. |
| **Continue** | Move to the next small lesson using a revisable path, or return later with recent context intact. |

The learner controls the pace. Continuing does not require a quiz, and reading a lesson or clicking “I understand” does not count as proof of mastery. Quiz answers, successful applied work, and recovery after a mistake build topic estimates gradually. Asking for examples or simpler explanations does not change the score.

Each topic displays a space-themed mastery rank: **Launch Pad → In Orbit → Cruising → Deep Space → Mission Ready**. Your topics pairs the rank with a badge, and Learning details shows how topics are distributed across ranks. Started topics without practice evidence begin at Launch Pad; Mission Ready requires repeated successful practice. Ranks describe demonstrated understanding, not syllabus completion. Incorrect evidence can lower a rank, while partial, unclear, or self-reported understanding earns no credit.

Numeric scores remain internal, supporting gradual progression and recommendations. Topic scores and bounded evidence records persist locally; the same recent task cannot award credit repeatedly, including after refresh. Earlier saved estimates remain usable, and browsing or restoring a lesson does not award mastery.

For example, a learner studying photosynthesis can read a short explanation, say **“You lost me,”** request a visual of the inputs and outputs, and then check their understanding. If they answer incorrectly, Orbit offers an adapted explanation and a simpler follow-up before they decide whether to continue.

## What Makes Orbit Different

- **“You lost me” is part of the lesson.** Ask for a new analogy, a familiar example, or smaller steps while staying with the same concept. The current learning flow remains available.
- **Teaching preferences are editable.** Choose explanation length, example timing, visual support, next-step guidance, and return support. Setup is optional, and a current request takes priority over a saved preference.
- **Course material shapes the starting point.** Attach multiple PDFs or JPG/JPEG, PNG and WebP photos, and add or remove materials later. Choose **Syllabus / course outline** and **Read syllabus & find dates** to extract course topics and deadlines. Ordinary resources use **Use PDF for learning** to provide learning context without importing calendar dates. Course photos retain filename/type only; select them as lesson references to work with their content.
- **Bring a page into the lesson.** **Add reference** attaches a temporary PDF or photo, or links an existing course material. Understand it, Work through it, Check my work, and Quiz me keep the page connected to the lesson. Up to four references, 3 MB combined, stay with the lesson/thread where you attached them, including when you leave and return. A new thread starts without them. Refreshing or successfully continuing to the next lesson clears them. They are not automatically added to course materials. After refresh, course selections use saved summaries when available; specific page questions need the original file again.
- **Practice goes beyond recall.** “Let me try it” offers a small prediction, comparison, explanation, or other applied task with focused feedback. “Quiz me” checks a topic and can follow a mistake with another approach.
- **Conversation stays connected to learning.** “Talk it through” uses the current lesson, recent discussion, and relevant remembered connections, so a question can deepen the work already underway.
- **Next steps stay revisable.** Orbit maintains a small learning path that can respond to new material, learner corrections, and learning context. Topic-level mastery helps distinguish areas that need another pass.
- **Visuals serve the concept.** Useful lessons can include a generated instructional image. “Show me” lets the learner request one for the current idea or point of confusion; the explanation remains usable while it loads.
- **Returning is part of the experience.** Recent lessons, compact study history, and useful learning context resume in the same browser. Home emphasizes the next learning action, with Calendar and Library supporting the work around it.

## Product Preview

Four moments from the current product. Select a screenshot to view it at full size.

<table>
  <tr>
    <td width="50%" valign="top">
      <a href="src/assets/Screenshots/Populated%20Home%20Screen.png"><img src="src/assets/Screenshots/Populated%20Home%20Screen.png" alt="Orbit Home with a return-to-learning action, learning spaces, and upcoming work" width="480" /></a>
      <br /><strong>A clear way back.</strong> Home brings the current learning action forward.
    </td>
    <td width="50%" valign="top">
      <a href="src/assets/Screenshots/Course%20page%20after%20syllabus%20upload.png"><img src="src/assets/Screenshots/Course%20page%20after%20syllabus%20upload.png" alt="Biology course after syllabus upload, with a recommended photosynthesis lesson and upcoming assignments" width="480" /></a>
      <br /><strong>Course-aware starting points.</strong> A syllabus becomes topics and upcoming work.
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <a href="src/assets/Screenshots/Photosynthesis%20lesson%20with%20photo.png"><img src="src/assets/Screenshots/Photosynthesis%20lesson%20with%20photo.png" alt="Photosynthesis lesson beside a generated diagram showing inputs, chloroplasts, and outputs" width="480" /></a>
      <br /><strong>See the relationship.</strong> A generated visual supports the photosynthesis explanation.
    </td>
    <td width="50%" valign="top">
      <a href="src/assets/Screenshots/Photosynthesis%20quiz.png"><img src="src/assets/Screenshots/Photosynthesis%20quiz.png" alt="Photosynthesis multiple-choice question with lesson context and study tools still available" width="480" /></a>
      <br /><strong>Check the concept.</strong> Practice stays connected to the lesson.
    </td>
  </tr>
</table>

Orbit is also the name of the floating planetary companion. Its custom artwork, quiet motion, and space-inspired environment give the product a familiar presence while keeping the learning task central.

## Built With Meta AI

Meta Muse powers the teaching within Orbit's adaptive loop. The current server implementation uses **Muse Spark 1.3** (`muse-spark-1.3`) for text and document work, and **Muse Image 1.0** (`muse-image-1.0`) for instructional images.

| Capability | How Orbit uses Muse |
| --- | --- |
| **Lessons and continuation** | Generate a short explanation and a few possible next concepts using course position, prior learning, mastery context, and preferences. |
| **Adapted teaching** | Re-explain the current concept after “You lost me” or produce a concrete worked example. |
| **Activities and evaluation** | Create small applied tasks and respond to the learner's attempt with focused feedback. Generate topic-aware quiz questions, plus corrective explanations and easier follow-ups after incorrect answers. |
| **Study conversation** | Answer questions in the context of the current lesson and recent exchanges, drawing on relevant saved learning connections. |
| **PDF analysis** | On an explicit reading action, extract syllabus topics and dates, or summarize an ordinary resource for learning without calendar extraction. |
| **Instructional visuals** | Spark can propose a visual when it helps explain a concept; Muse Image generates it. Learners can also request a visual through “Show me.” |

Orbit supplies relevant context and applies its own rules around those responses. Learner corrections take priority over inferred course position. Quiz scoring and mastery updates are handled by application logic; Muse supplies the questions and adapted teaching. Home and course starting suggestions use saved context and local course-position rules, so opening a page or resuming a saved lesson does not trigger a fresh model request.

The request path is **React frontend → Vercel serverless API → Meta Muse → Orbit**. Review the handlers in [`api/`](api/) and the named client calls in [`src/services/meta.js`](src/services/meta.js) and [`src/services/lessonImages.js`](src/services/lessonImages.js).

## Privacy & Learner Memory

The current demo requires **no learner account** and uses bounded browser-local storage rather than an application database or cross-device sync.

- **Saved here:** learning spaces, extracted course context, topic mastery, preferences, learner corrections, recent lessons, compact conversation history, and useful learning connections. Recent generated-image references are also saved so available visuals can be reused.
- **Sent for AI processing:** attaching a file makes no AI request. Choosing a PDF reading action sends that PDF through Orbit's server to Meta. Relevant extracted resource summaries can then accompany explicitly requested lessons, questions, activities, and discussion. Attached lesson references accompany explicit teaching actions and messages as structured image/PDF inputs or saved summaries. Local storage does not mean that AI features run offline.
- **Material retention:** Orbit keeps course filenames, metadata, and bounded extracted context. Original files remain only in the live session; after refresh, select the same file again to read its original content. PDF/image bytes are never saved in localStorage or available for reopening/downloading. Lesson references and work derived from them are temporary: the last ordinary lesson remains the saved resume point until continuing. Practice evidence and explicit class corrections still follow the existing rules. Removing a lesson link leaves the course material intact. Removing a course resource removes its summary from future course context; previously generated lessons remain. Removing a syllabus keeps its already imported topics and dates. Full conversations, unfinished activity/quiz screens, and response drafts are not restored after refresh.
- **User control:** Library includes a control to clear local learning data. Teaching preferences can be edited or reset separately. Anyone using the same browser profile can access its saved learning data; clearing browser data removes it.

API credentials remain server-side. The browser calls Orbit's API routes and never receives `MODEL_API_KEY`.

The picker accepts multiple photos or files; a separate **Take a photo** control uses the browser's rear-camera preference where supported. Course attachments allow PDFs up to 3 MB and photos up to 20 MB; temporary lesson references allow four PDF/JPG/JPEG/PNG/WebP files up to 3 MB combined. HEIC/HEIF receives a clear request to export as JPG, PNG or WebP; no conversion dependency was added. Structured image/PDF inputs follow [Meta's Responses schema](https://dev.meta.ai/docs/api-reference/responses/schemas). Live-provider reading quality and real phone picker/camera behavior still need verification.

## Tech Stack

- **React 19, JavaScript, and CSS** for the interface and learning flow
- **Vite** for frontend development and builds
- **Meta Muse Spark and Muse Image** for teaching, document analysis, and visuals
- **Vercel Serverless Functions** for server-side model requests
- **Browser localStorage** for bounded learner memory
- **ESLint and Node's test runner**, with Happy DOM for component tests

## Running Locally

Use **Node.js 22.12+**, npm, the Vercel CLI, and your own Meta API credentials with access to the models above.

### 1. Install

From the repository root:

```bash
npm install
npm install --global vercel
```

Skip the second command if the Vercel CLI is already installed.

### 2. Configure the server

Create an uncommitted `.env.local` in the repository root:

```dotenv
MODEL_API_KEY=your_meta_api_key
```

Environment files are ignored by Git. Keep this key server-side: do not prefix it with `VITE_`, place it in frontend code, or commit it. Use your own Vercel project if the CLI prompts you to link one.

The `dev:api` command sets `NODE_ENV=development` for the local Vercel process and its API workers. Vercel's local function runtime does not always set it, even while Vite runs in development. Without it, Orbit requires the public-demo limiter configuration and can return `503 demo_temporarily_unavailable`. Local development needs the model key but no public-demo Redis credentials; model calls still use provider credits. Do not put `NODE_ENV=development` in `.env.local` or deployed configuration: that can affect production builds. Restart `dev:api` after updating the startup script or environment.

### 3. Start the full app

```bash
npm run dev:api
```

Open the URL printed by Vercel. This runs the frontend and the root `/api/*` functions together. Start from **Learn** with a topic, or create a class space and add a PDF to try course-aware learning.

| Command | Purpose |
| --- | --- |
| `npm run dev:api` | Full local app, including serverless AI routes |
| `npm run dev:portfolio -- --listen 5173` | Full local app with Portfolio Mode explicitly enabled |
| `npm run dev:live -- --listen 5173` | Full local app with Portfolio Mode explicitly disabled |
| `npm run check:portfolio -- http://localhost:5173` | Verify the running local server's eight guarded AI routes |
| `npm run dev` | Vite frontend only; does not execute `/api/*` |
| `npm run build` | Production frontend build |
| `npm run preview` | Preview that frontend build; no serverless API runtime |
| `npm run lint` | ESLint checks |
| `npm test` | Automated tests |

Use `dev:api` for lessons, uploads, conversation, and image generation. If the interface opens but AI actions fail under plain Vite, switch to the full runtime and check the server-side key.

## Optional Portfolio Mode

Orbit can remain an interactive portfolio after the hackathon without ongoing AI inference. **Portfolio Mode is disabled by default.** When enabled, AI actions return Orbit's predefined reply and a **Watch the Demo** link to the [original recording](https://youtu.be/-xQGO-GYUVg). Home, spaces, topics, saved local lessons, the mascot, and prompt inputs remain available. Replies appear immediately in the existing assistant layout, without simulated streaming or new mastery, progress, quiz results, extracted file context, or learner memories. Creating a space or attaching a file still saves its ordinary local metadata.

When genuine recommendations are empty, Learn's existing carousel offers Orbital Motion, Music Theory, Photosynthesis, and The Psychology of Habits. These examples are display-only: browsing them never creates spaces, learning history, or progress. Selecting a new topic opens the existing editable space form; genuine recommendations always take priority.

To select it for local development, keep this setting in your uncommitted `.env.local`:

```dotenv
ORBIT_PORTFOLIO_MODE=true
```

- **Locally:** stop the full API server with Ctrl+C, run `npm run dev:api -- --listen 5173`, and reload `http://localhost:5173`. The launcher explicitly passes the local portfolio setting to Vercel's API workers. A `[vite] server restarted` message only means the frontend restarted; changing `.env.local` requires restarting the full command. Portfolio Mode does not require a model key or Redis credentials. Plain Vite still does not serve the API routes.
- **Explicit local switches:** `npm run dev:portfolio -- --listen 5173` enables the mode regardless of the local setting; `npm run dev:live -- --listen 5173` disables it. These commands affect only their child development processes, never builds or deployed settings. Precedence is the explicit command, then `.env.local`, then the inherited environment, then disabled by default. The launcher prints ON/OFF without any credentials and rejects invalid setting values. Keep `.env.local` uncommitted; the scripts themselves are safe to commit.
- **On Vercel, when ready to retire live AI:** first include this feature's code in the deployment you intend to use. In the project's Environment Variables settings, add `ORBIT_PORTFOLIO_MODE` with value `true` to the intended environment, then create a new deployment from that code and reload the app. [Environment changes apply only to new deployments](https://vercel.com/docs/environment-variables), so changing the setting alone does not retire the current demo.
- **To disable it persistently:** set the local variable to `false`, restart `dev:api`, and reload. Removing it falls back to the inherited environment or disabled. For Vercel, remove it or set it to `false` and create a new deployment. Normal AI then uses the existing server credentials and demo limiter. Only `true` enables the mode (case and surrounding whitespace are ignored); do not use a `VITE_` prefix.

After startup, run `npm run check:portfolio -- http://localhost:5173`. It checks actual local HTTP responses for every AI route, streaming, retries, and PDF actions. It first sends an invalid lesson request and stops if Portfolio Mode is absent, so checking a stale live server cannot trigger inference. It accepts loopback HTTP origins only. The component regression suite can also run against that server by setting `ORBIT_TEST_LOCAL_URL=http://localhost:5173` for the test process; it uses the same safe probe before sending valid inputs.

The guard covers all eight AI routes: lesson generation (including next, simpler explanations, and examples), quiz generation and answer evaluation, streamed and ordinary conversation, activity generation/evaluation, PDF analysis, recommendations, and image generation/retries. It runs before payload/file processing, rate limiting, and provider calls. Requests receive HTTP 200 JSON with `mode: "portfolio"`, the reply, and the demo URL, plus `X-Orbit-Mode: portfolio` and `Cache-Control: no-store`; even a streaming request gets this immediate JSON response. The shared client intercepts it before teaching or persistence code runs. Request parameters cannot override the server setting. Vite exposes only a boolean from the resolved startup/build environment for Learn's example cards; API enforcement remains server-side. The local launcher supplies that boolean to both runtimes without enabling it in ordinary builds.

When retiring inference across the whole project, also retire older reachable deployments with live AI or revoke their provider credentials: the new guard cannot change old deployment URLs or already-running requests. Local mode selection does not change Vercel environment settings, deployed sites, or the live demo.

## Project Documentation

- [BUILD_LOG.md](BUILD_LOG.md) — development milestones, decisions, and lessons from building Orbit.
- [CHANGELOG.md](CHANGELOG.md) — current changes and detailed manual verification checklists.
- [UI_DIRECTION.md](UI_DIRECTION.md) — the product's visual, interaction, and attention-aware design direction, including longer-term ideas.
- [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) — hackathon demo preparation, verification evidence, and remaining checks.

Orbit is an actively developed hackathon project. Its current adaptation uses explicit preferences, recent context, and practice evidence; deeper long-term personalization remains part of the direction.

Built by **Devon Cline** as an exploration of learning experiences that respond to the individual.
