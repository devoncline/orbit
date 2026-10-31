# Orbit

**An adaptive AI learning companion that doesn't just learn what you know — it learns how to teach you.**

> 🚧 **Work in progress** — Orbit is actively being developed for the 2026 Meta AI Developer Hackathon.

Orbit is a personalized learning experience designed to help people understand difficult material, figure out where they are struggling, and decide what they should learn next.

Instead of acting like a traditional chatbot or simply generating study material, Orbit follows an adaptive learning loop:

**Learn → Practice → Evaluate → Adapt → Continue**

The goal is to make learning feel less like managing a school dashboard and more like having a learning companion that understands where you left off, what is confusing you, and how to explain something differently when it is not clicking.

---

## The Idea

Most learning tools know **what content** someone is studying.

Orbit is being built to understand more:

- What does this learner already understand?
- Which concepts are still weak?
- What should they work on next?
- Which explanations seem to work best for them?
- When should something be reviewed again?
- How can a confusing concept be broken into a smaller, clearer step?
- Where did the learner leave off?

The long-term idea is simple:

> **Orbit doesn't just learn what you know. It learns how to teach you.**

---

## Why Orbit?

A lecture, textbook, video, or traditional course usually has to explain something one way to everyone.

But learners do not all get stuck in the same place.

Someone might understand the overall concept but struggle with one small part. Someone else may need an example before a definition makes sense. Another learner may lose the thread when an explanation becomes too long.

Orbit is designed around the idea that learning should be able to change in response.

Instead of simply repeating the same explanation or marking an answer wrong, Orbit is being built to recognize where understanding is breaking down and try a different approach.

That adaptive behavior is the core of the project.

---

## Attention-Aware Learning

Orbit is being designed with learners who struggle with attention, information overload, task initiation, and returning to unfinished work in mind.

This includes many learners with ADHD, but Orbit intentionally avoids treating ADHD as one universal learning style.

Rather than building a single "ADHD mode," Orbit focuses on adaptable behaviors that can help different learners in different situations.

Attention-aware interactions include:

- Short, focused lesson chunks
- Clear next actions
- Lightweight understanding checks
- Adaptive explanation styles
- Easy return-to-task context
- User-controlled pacing
- Minimal information overload
- No guilt or streak-based pressure

This is also an important part of Orbit's direction as a product.

AI learning tools are becoming increasingly common, so Orbit is not trying to differentiate itself by simply generating lessons or quizzes. The focus is on building a learning experience that is especially useful for people who often struggle with traditional, one-size-fits-all teaching.

The goal is not to claim that every learner with ADHD learns the same way.

It is to build a system that can notice how an individual responds and adjust the experience around them.

One of the core interactions is:

### "I lost you"

During a lesson, a learner can tell Orbit that the explanation stopped making sense.

Instead of simply repeating everything, Orbit can try a different approach and keep the learner inside the same learning flow.

Other learning controls include:

- **Explain that differently**
- **Give me an example**
- **Let me try it**
- **Quiz me**

---

## Current Features

Orbit currently includes:

### Learning spaces

Orbit organizes learning into spaces.

A space can represent a class, skill, personal interest, or another subject someone wants to learn.

This allows Orbit to support both structured coursework and self-directed learning.

### Adaptive learning recommendations

Orbit uses available learning context to recommend what the learner should work on next.

The Home experience prioritizes the next useful learning action instead of presenting a traditional analytics dashboard.

### Learning material input

Learners can add learning material to a space so Orbit has more context about what they are studying.

PDF materials can currently be uploaded and analyzed.

### Short AI-generated lessons

Study sessions begin with a focused lesson based on the current topic and learning context.

Instead of immediately dropping the learner into a quiz, Orbit first gives them something to understand and interact with.

### Guided lesson progression

Orbit can build a small, revisable learning path inside a study session.

The learner can move forward when they feel ready without being forced to take a quiz first.

Upcoming lessons are not treated as a permanent curriculum. They can change as Orbit receives new learning material, learner corrections, mastery information, or other useful context.

Moving to the next lesson represents readiness to continue — not proof of mastery.

### Conversational learning

Learners can ask questions or share connections during a lesson without leaving the current learning flow.

Orbit can respond using the context of the lesson and recent conversation.

Talk It Through keeps the four most recent completed exchanges in a learning transcript. Simple learner bubbles sit on the right; Orbit replies use a subtle navy/lavender surface on the left, without visible speaker labels. The composer clears on send, and a compact Orbit Signal appears in the pending reply bubble. Real streamed text arrives in adaptive word groups with light punctuation pauses; final formatting and saving wait until the visible text catches up. Older exchanges collapse below Suggested next. Interrupted replies restore the message for retry, and only completed exchanges and validated learning context are kept for resume. The existing saved resume still retains two recent exchanges.

The same compact Orbit Signal marks the result location for lessons, examples, activities, activity feedback, quizzes, and adapted explanations while their complete responses load. These structured results use a brief display reveal after arrival, not network streaming; short results appear promptly and longer transitions stay under a second. The line shortens on phones, reduced motion skips progressive reveals, and the companion keeps its existing thinking state and single loading announcement.

### Adaptive explanations

If something is not clicking, the learner can ask Orbit to explain it differently or provide a concrete example.

### Practical activities

**Let me try it** generates a short activity based on the concept currently being learned.

The learner can attempt the activity and receive focused feedback before continuing.

### Adaptive quizzing

Orbit can generate questions based on the current concept and learning context.

Answers can lead to adapted follow-up questions instead of stopping at a simple correct or incorrect result.

Quizzes and lesson progression remain separate: moving forward in a lesson does not automatically increase mastery.

### Topic-level mastery

Mastery is tracked at the individual topic level.

Answering questions updates the relevant topic instead of blindly changing an entire course score.

Overall mastery can then be calculated from the learner's topic mastery.

### Intelligent topic selection

When generating study material, Orbit can consider weaker topics, current learning context, and upcoming work when deciding what the learner should practice.

### Course-aware learning

For structured learning, Orbit can use course material and timing information to stay aligned with what the learner is actually studying.

Learners can also correct Orbit when its understanding of their current position is wrong.

Those corrections can influence future lessons without forcing the learner to abandon the lesson they are currently working through.

### Calendar

Orbit includes a lightweight Calendar experience for upcoming work and dated learning material.

### Library

The Library provides access to learning spaces, materials, and local learning controls.

### Resumable learning sessions

Orbit can retain recent learning context so a learner can leave and later continue without every session starting from zero.

This includes recent lesson progress and learning-path context.

Current persistence is stored locally in the browser.

---

## Current Home Experience

The current Home screen is designed to answer one question:

> **What should I work on next?**

Rather than using a dashboard full of statistics, Orbit prioritizes:

1. The next useful learning action
2. The relevant learning space or topic
3. Why the recommendation matters
4. A clear way to continue
5. Progress and mastery as supporting information

Home also provides ways to begin from a class, personal interest, or learning material when no previous learning exists.

The interface is responsive and designed for both desktop and smaller screens.

---

## Current Learn Experience

Learn provides a more direct way to begin studying.

A learner can enter something they want to learn and begin a focused session without needing to manually set up a full course first.

If an existing learning space already matches the subject, Orbit can continue using that space instead of creating a duplicate.

Active learning sessions can also be resumed through Learn.

Once learning begins, Orbit can guide the learner through a small adaptive sequence of lessons rather than treating every interaction as an isolated prompt.

---

## Orbit — The Companion

<p align="center">
  <img
    src="./docs/assets/orbit-companion.webp"
    alt="Orbit, the adaptive AI learning companion"
    width="520"
  />
</p>

<p align="center">
  <em>Orbit — a strange little planetary companion built to learn how you learn.</em>
</p>

Orbit is also the name of the learning companion that lives inside the product.

The current visual direction is a floating planetary creature made from:

- a translucent glowing inner core
- separated rocky crust fragments
- pieces that appear to orbit around the center

The goal is for Orbit to feel less like a generic AI robot and more like a strange creature that gradually becomes familiar through its personality.

Orbit uses gentle floating motion and shifts into a thinking state while preparing a response. Short contextual phrases rotate between requests and stay steady during each one, with one phrase on phones and static visuals for reduced motion.

Future character behavior may include:

- reacting to answers
- listening
- celebrating
- becoming shy
- pulling its rocky crust inward like a protective shell
- reacting to learning progress
- interacting with the learning environment

Motion is intended to add personality without competing with the learner's attention.

---

## Visual Direction

Orbit is designed to feel like a **learning environment**, not school-management software.

The visual system currently uses:

- Midnight / blue-charcoal foundations
- Periwinkle and violet accents
- Atmospheric space-inspired environments
- Custom Orbit branding
- Custom companion artwork
- Subtle ambient movement
- Open layouts
- Minimal dashboard-style UI
- Responsive desktop and mobile experiences

The project intentionally avoids relying entirely on generated UI components.

Custom branding, illustration, backgrounds, and environmental artwork are being developed alongside the coded interface so the experience feels art-directed rather than like a generic AI-generated website.

A more detailed design baseline is documented in:

`UI_DIRECTION.md`

---

## Design Principles

A few rules guide Orbit's interface:

### Learning over analytics

The next learning action should usually be more prominent than the learner's statistics.

### Focus over information density

If showing more information makes it harder to understand what to do next, show less.

### Interruptible learning

Learners should be able to stop an explanation when it stops making sense and ask for a different approach.

### Practice over passive consumption

When possible, Orbit should give the learner something to apply rather than only more information to read.

### Progress without forced testing

A learner should be able to continue when they feel ready without every lesson requiring a quiz.

Practice and mastery checks remain available when they are useful.

### Motion around the product

Most motion should come from Orbit and the surrounding environment rather than constantly moving buttons and cards.

### No guilt mechanics

Orbit should make it easy to return after losing focus or taking a break.

### Companion, not mascot decoration

Orbit should eventually react to and participate in the learning experience rather than simply appearing as artwork beside it.

### Adapt instead of assume

The system should learn which approaches work for an individual rather than assuming every learner needs the same teaching style.

### Support existing learning

When someone is already following a class, curriculum, or structured learning path, Orbit should work alongside it instead of replacing it with a completely separate curriculum.

---

## Tech Stack

Orbit is currently built with:

- **React 19**
- **JavaScript**
- **Vite**
- **CSS**
- **ESLint**
- **Meta Muse**
- **Vercel serverless functions**
- Browser-based local persistence

Custom visual assets are created separately and integrated into the React interface.

---

## Project Structure

```text
src/
├── assets/
│   ├── backgrounds/
│   ├── brand/
│   └── mascot/
│
├── components/
│   ├── AppShell.jsx
│   ├── HomeScreen.jsx
│   ├── LearnScreen.jsx
│   ├── StudySession.jsx
│   ├── OrbitStage.jsx
│   ├── SpaceScreen.jsx
│   ├── CoursePosition.jsx
│   ├── CourseDetails.jsx
│   ├── AddCourse.jsx
│   └── AddCourseFile.jsx
│
├── services/
├── App.jsx
└── main.jsx

api/
└── AI-powered learning endpoints
```

The project structure will continue evolving as additional adaptive-learning systems and visual experiences are added.

---

## Running Orbit Locally

### Requirements

- Node.js
- npm
- Vercel CLI

Install the Vercel CLI if needed:

```bash
npm install --global vercel
```

### Install dependencies

```bash
npm install
```

### Configure the API

Orbit's AI features use server-side API routes.

To run them locally, configure your own required API credentials as environment variables.

For example:

```text
MODEL_API_KEY=your_api_key
```

Keep API keys server-side.

Do not:

- prefix private keys with `VITE_`
- place them in frontend code
- commit them to the repository

You can use a local Vercel environment or your own linked Vercel project for development.

### Start the full app

To run both the Vite frontend and the serverless API routes:

```bash
npm run dev:api
```

Open the local URL printed by Vercel.

This runs the frontend and the root `api/*.js` functions together so `/api/*` requests reach the local server handlers.

### Frontend only

```bash
npm run dev
```

This starts the Vite frontend only.

Plain Vite does **not** execute Orbit's serverless API routes, so AI-powered features will not work correctly when using this command by itself.

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

This previews the frontend build only.

Use `npm run dev:api` when testing features that require `/api/*`.

### Run ESLint

```bash
npm run lint
```

### Run tests

```bash
npm test
```

---

## Current Development Status

Orbit is under active development.

The current focus is strengthening the core learning experience and preparing a polished hackathon demo.

### Completed / in progress

- [x] React/Vite project foundation
- [x] Responsive application shell
- [x] Learning spaces
- [x] Separate Home and Learn experiences
- [x] Learning material input
- [x] AI-generated lessons
- [x] Guided adaptive lesson progression
- [x] Conversational learning
- [x] Adaptive explanations
- [x] Concrete examples
- [x] "Let me try it" activities
- [x] Activity feedback
- [x] AI-generated quizzes
- [x] Adaptive follow-up questions
- [x] Topic-level mastery
- [x] Topic-aware question generation
- [x] Learning recommendations
- [x] Course-aware learning context
- [x] Calendar experience
- [x] Library experience
- [x] Resumable study sessions
- [x] Local learning persistence
- [x] Optional learning preferences
- [x] Orbit visual identity
- [x] Orbit companion artwork
- [x] Atmospheric learning environment
- [x] Responsive desktop/mobile UI
- [ ] Deeper adaptive learning behavior
- [x] Optional Muse Image lesson visuals
- [ ] Expanded Orbit character interactions
- [ ] Additional attention-aware learning tools
- [ ] Final hackathon demo polish

---

## Adaptive Learning Paths

Orbit is designed to support both structured and open-ended learning.

Rather than generating one large permanent curriculum upfront, Orbit can maintain a smaller learning path that changes as the learner moves forward.

For structured learning, that path can adapt around the material the learner is already expected to cover.

For self-directed learning, Orbit can gradually decide what the most useful next concept should be.

The path can evolve based on:

- what the learner already understands
- what they are struggling with
- what they have recently studied
- what material they provide
- how they respond to lessons and practice
- corrections they make
- changes in their goals or progress

Orbit can reconsider upcoming lessons without interrupting the lesson currently in progress.

It may eventually insert review steps, skip material that is already understood, or branch into prerequisite concepts when necessary.

---

## Dynamic Learning Visuals

Muse Spark decides whether imagery materially improves the current lesson. It returns either `none` or a bounded `generated_image` brief describing the purpose, concepts, emphasis, composition, explicit relationships, and optional conceptual recovery need. Processes, systems, mechanisms, and comparisons often benefit; simple recall and definitions may remain text-only. The lesson text always stands alone.

`LessonVisual` requests an image separately through `generateLessonImage()` in `src/services/lessonImages.js`. The browser calls `POST /api/generate-lesson-image`; that Vercel function calls `https://api.meta.ai/v1/images/generations` with `muse-image-1.0`, `n: 1`, WebP, and a URL response. It uses the existing server-only `MODEL_API_KEY`. No new key, dependency, cloud storage, or database is required. Image search, web search, and shell tools are explicitly disabled. The 180-second provider timeout fits inside the configured 200-second function duration.

The image prompt uses only the bounded course name, topic, concept, current explanation, and visual brief. It asks for a sophisticated educational illustration, clear relationships and emphasis, minimal text, and a dark blue/violet-compatible palette without decorative planets or generic sci-fi filler. Full conversations, course files, scores, and credentials are not sent as image context.

While the image generates, the lesson and unrelated controls stay usable with a local status inside a reserved image surface. Visual mode gives the image most of the desktop lesson width; an opaque dark frame and `object-fit: contain` preserve the full image and its descriptive alternative text. Generation or image-loading failure removes the image, returns to a suitable nonvisual layout, and offers a quiet Retry visual action. There is no native, planet, stock-art, or SVG fallback.

Each mounted StudySession owns an in-memory cache keyed by the complete bounded lesson/visual request. Pending requests, completed URLs, and failures survive React StrictMode, rerenders, tool switches, Home/Learn navigation, and thread switches. Identical reuse does not generate another image; a changed explanation, concept, or visual brief uses a new entry. Late responses cannot install a visual for a different request. Retries after failure are explicit, with no automatic paid retry loop. Inactive restored threads defer generation until opened.

Talk It Through preserves its text-first behavior and can return a new brief or reuse the current brief. Streaming accepts visual metadata only after validated completion. A supplemental image sits beside the discussion on wide screens and below it on narrower screens; it clears on successful simplification or continuation. This does not change conversation text, scores, course positioning, or path progression.

Only the compact lesson visual brief is saved by the existing resume projection. Generated URLs and image bytes are never written to localStorage; supplemental conversation visuals remain session-only. A full page reload starts a new image cache and may generate the restored lesson image again. Returned URLs are temporary signed URLs; their lifetime is not assumed. An expired URL is omitted and requires an explicit retry. Returning only a bounded URL keeps image bytes out of Vercel's response-size limit. This first implementation has no durable image history or cross-session cost deduplication.

The old renderer remains in `src/components/LegacyLessonVisual.jsx`, with `src/services/lessonVisualComposition.js`, `nativeLessonVisual()`, its existing scene CSS, fixtures, and tests retained for rollback/reference. Learner-facing code never imports it. Older saved native specifications are translated into generated-image briefs, preserving their instructional purpose.

Validation includes mocked provider/mounted React tests and a real local serverless walkthrough with Muse Spark and Muse Image. The full orbital-motion journey covered recovery, Show me, practice feedback, quiz recovery, progression, and return; real photosynthesis and React props/state image samples were also inspected. Image prompts now favor large short labels and explicit arrow directions, but generated scientific diagrams still require inspection. See [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) for current evidence, recording setup, production checks, and remaining manual coverage. Image editing, simulations, animated teaching scenes, and Save to notes remain deferred.

## Controlled Study Presentation

Study uses five authored compositions. `src/services/studyPresentation.js` selects a normalized mode, reason, primary action location, and short guidance from the active interaction and validated learning state. `useStudyPresentation` reads the existing image cache without generating or retrying requests. Model output cannot supply layouts, markup, components, CSS, class names, or styles.

| Mode | Composition |
| --- | --- |
| `focus` | Calm lesson or discussion with a companion and one emphasized next action. Study tools stay collapsed. |
| `visual` | Asymmetric lesson/image split, with about two-thirds of the lesson area devoted to the image and a compact companion. A discussion can also use its own image. |
| `practice` | Activity instructions and response form lead; the lesson remains in a closed Lesson context disclosure. |
| `check` | Question and full-width answer controls lead, with lesson context available below. |
| `recover` | Narrower explanation, feedback, or follow-up with one primary task. Earlier discussion collapses during conversation recovery; supporting imagery stacks below the explanation. |

Priority is **active recovery > active quiz > active activity > active usable/pending image > focus**. Recovery is scoped to the interaction currently open:

1. Lesson recovery starts with **I lost you** and stays active while simplification loads, succeeds, or fails. **That helps**, selecting another tool, or successfully continuing ends that presentation state. That helps does not update readiness, mastery, or memory.
2. Quiz recovery requires an incorrect answer with an active adapted explanation, pending evaluation, or evaluation retry. A successful follow-up returns to check; loading a new question ignores the old recovery result.
3. Activity recovery requires misconception or partial-understanding feedback matching the current response. Resubmitting that response retains recovery while feedback loads. Editing it or generating a new activity returns to practice.
4. Conversation recovery uses the latest completed confusion signal. Pending replies keep that layout; a newer non-confusion signal releases it. Previous quiz mistakes cannot override a different active tool.

A valid current image brief selects visual immediately and retains it through generation and image decoding. Image errors return to focus unless recovery is active; only an explicit retry re-enters visual. The existing request key isolates late images from a different lesson. Successful continuation resets lesson-specific recovery, while failed continuation retains the current lesson and mode. Presentation state is not persisted and introduces no new learning evidence.

Wide screens keep the shared sidebar and use the split visual composition above 1100px. At tablet widths the image stacks at full content width and focus uses a compact companion column to leave more reading space. At 760px and below every mode uses one column: focus retains a compact full mascot; task layouts hide the artwork while keeping its accessible request status. Existing focus indicators, controls, live regions, and reduced-motion behavior remain; no layout animation is added. Automatic mode changes do not move focus. Existing explicit tool/lesson navigation still focuses the active panel.

Selector and mounted React tests cover all five modes, pending/error transitions, recovery exits, preserved history/drafts, keyboard focus, next-lesson reset, image request reuse, and unchanged mastery writes. See the ordered adaptive-presentation checklist in CHANGELOG.md for browser review. New AI APIs and legacy-renderer removal remain deferred.

### Optional learning preferences

Home offers **Help Orbit learn how you learn** below the main learning entry. Setup is optional: **Not now** dismisses the invitation, and **Skip setup** leaves the current defaults intact. Home and Library both provide an editable **Your Orbit setup** summary and **Reset preferences**. Reset affects only teaching preferences; clearing all local learning data also removes the profile. This is a short instructional-preference setup, with no screening, scores, or learner-type labels.

Five questions cover six teaching concerns by pairing choice density with check-in frequency:

| Question | Stored field and choices | Default |
| --- | --- | --- |
| How much information do you like at once? | `chunkSize`: `short`, `balanced`, `detailed` | `balanced` |
| Where should an explanation start? | `exampleTiming`: `early`, `after`, `balanced` | `balanced` |
| When would you like visual support? | `visualPreference`: `often`, `helpful`, `on_request` | `helpful` |
| How should Orbit help with the next step? | `guidance`: `focused`, `balanced`, `explore` | `balanced` |
| When you come back to a lesson, what helps? | `reentrySupport`: `where_left_off`, `recap`, `continue` | `recap` |

The existing `orbit.learner-memory` localStorage record is now version 2. Its new allowlisted `learningPreferences` property contains `{ status: 'new' | 'saved' | 'dismissed', profile: { ...five fields above } }`. Version 1 snapshots migrate in memory with default preferences, then save as version 2; courses, mastery, corrections, lessons and thread state retain the existing projection. Missing/malformed fields fall back individually. A saved or dismissed setup persists even with no spaces. The same storage limit and unavailable-storage warning apply. No raw survey text, accounts, database, or additional persistence service is involved.

Named Study services send only normalized `learningProfile` enums in existing requests. The lesson, conversation, activity, question and answer-explanation endpoints normalize again and convert those enums into authored guidance via `formatLearningProfile()`. Raw answers and arbitrary profile fields never enter model instructions. Guidance cannot override course facts, correctness, safety, grading, output limits or a current explicit learner request. Saving/editing a profile adds no model request and does not regenerate an existing lesson or image; the next teaching request uses the new choices.

- Short explanations favor smaller steps (lesson target 35–60 words); fuller explanations favor a useful connection (80–100 words). The existing 100-word/900-character lesson limit and factual requirements remain.
- Early examples lead teaching explanations with something concrete. They cannot reveal an unanswered quiz/activity solution.
- More visual support lowers the image-selection threshold only for meaningful instructional value. On-request support suppresses automatic lesson visuals at the server response boundary as well as in Spark guidance. **Show me** always works, regardless of preference; existing generated images and cache entries remain intact.
- Focused guidance keeps secondary tools collapsed and quiet, highlights one recommendation, and may suggest an optional Quiz me earlier. Conversation/activity feedback may offer at most one natural, optional check. Existing active recovery, task, error and progression priorities win. Explore starts with Study tools expanded; all tools remain accessible in every setting.
- Re-entry uses existing saved summaries or mounted session context. More support names the lesson/tool and next way to resume; a short recap is the default; continue hides the notice. Restored quiz/activity screens accurately say they start fresh. Returning to an already mounted session preserves its current work. Recaps add no progress records or model calls.

The centralized presentation selector owns choice density and retains the five existing modes. Profile settings do not change mastery, scores, course-position inference, path-advancement rules, or global navigation. Model-produced style and visual choices are guidance-based, so live output still needs inspection.

The isolated review has **guided profile** and **explore profile** scenarios with editable preferences below Study. These are layout fixtures using fixed teaching responses/reference imagery. A separate real-model comparison confirmed shorter/example-first/automatic-visual versus fuller/concept-first/on-request teaching after resolving conflicting prompt instructions. Both saved profiles, changed guidance, and return behavior were inspected in Chrome without changing mastery rules. Physical-device and full screen-reader checks remain manual; see SUBMISSION_CHECKLIST.md for the precise coverage.

### Show me

**Study tools → Show me**, immediately after Lesson, lets the learner request an instructional image even when the lesson has no automatic visual. It opens the existing Visual composition with the current explanation still visible. Lesson context, earlier work, quiz answers, and activity drafts remain available through the existing tools. Selecting it does not change readiness, mastery, scores, or path progress.

`studyVisualRequest.js` captures a bounded snapshot on the click: course/topic/concept, the lesson, the active example/task or latest completed discussion, and matching feedback or the current quiz/follow-up answer. Active and recent recovery explanations get priority over generic lesson text. Attempts are labelled as potentially incorrect, and the server instructs Muse Image to use corrective teaching context. No new API, image client, visual schema, layout, or learner-memory storage is introduced.

Recovery deliberately transitions to Visual while preserving the simpler/corrective explanation beside the image. Returning to the original tool restores its task and recovery state. The existing normalized request key/cache reuses pending and ready images across rerenders, tool changes, and mounted-thread navigation. An unchanged automatic brief uses the same key. Failed images stay failed until **Retry visual** or another deliberate **Show me** click; no background regeneration occurs. A changed context is captured only on another click. Successful simplification or continuation clears the explicit snapshot, and late responses cannot install an old image in the new lesson.

The snapshot and recent recovery context are memory-only. Existing image loading announcements, image framing, alt text, focus behavior, and reduced-motion rules are reused. Mocked unit and mounted React tests cover the flow; real Show me generation from a recovery explanation has also been inspected in Chrome. Native control succeeded in this pass. The isolated review includes an image-request counter and **Fail next image** control for deterministic regression checks, using mock responses and a reference image. See SUBMISSION_CHECKLIST.md for live evidence and remaining failure/expiry checks.

---

## Learning How the Learner Learns

Orbit currently remembers useful learning context and recent interactions.

The larger goal is for that history to influence future teaching decisions.

Over time, Orbit could become better at noticing patterns such as:

> This explanation style seems to work better for this learner.

> This concept keeps causing confusion in different situations.

> The learner understands the main idea but is missing one underlying piece.

> A practical example may work better than another definition.

The goal is not to assign someone a permanent "learning style."

It is to adapt based on what actually helps them learn.

---

## Long-Term Vision

Orbit should eventually allow someone to start with almost anything:

- a class
- a syllabus
- lecture notes
- a PDF
- an image
- pasted text
- a question
- or simply a subject they want to understand

and turn it into a personalized learning journey.

The system should continuously ask:

> What does this learner understand?

> What are they missing?

> Why are they missing it?

> How should this be explained differently?

> What should happen next?

That is the experience Orbit is being built toward.

Features such as account-based persistence and cross-device learning may be explored later if Orbit continues beyond the hackathon, but they are not part of the current hackathon scope.

---

## Hackathon

Orbit is being developed as an entry for the **2026 Meta AI Developer Hackathon**.

The project explores how Meta Muse can power an AI experience that goes beyond one-shot generation or a traditional chatbot and instead participates in an ongoing adaptive learning loop.

The project is actively evolving, so features, visuals, architecture, and documentation may change throughout development.

---

## Development Notes

For a chronological record of development progress, see:

- `BUILD_LOG.md`
- `CHANGELOG.md`

For the project's visual and interaction design principles, see:

- `UI_DIRECTION.md`

---

## Creator

**Devon Cline**

Built as an exploration of adaptive AI, personalized education, attention-aware learning, and learning experiences that respond to the individual instead of forcing every learner through the same path.
