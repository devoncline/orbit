# Orbit Build Log

This document records the major milestones I completed while building Orbit for the Meta Global AI Developer Hackathon.

Orbit is an adaptive learning companion powered by Meta Muse. The goal is not to create a traditional education dashboard or a basic chatbot. Orbit is designed to understand what a student is learning, decide what they should work on next, teach and quiz them, evaluate their performance, and adapt based on what they understand.

The core learning loop is:

**Learn → Quiz → Evaluate → Adapt → Continue**

---

## October 26, 2026

### Project Foundation

**Built**
- Created the public `orbit` GitHub repository.
- Cloned the project locally using GitHub Desktop.
- Opened the project in VS Code.
- Initialized a React application using Vite.
- Selected JavaScript and ESLint.
- Installed the project's npm dependencies.
- Started the local Vite development server.
- Removed the default Vite starter interface.
- Created the first Orbit React interface.

**Learned**
- React is used to build Orbit's interface through reusable components.
- Vite creates and runs the development environment.
- npm installs and manages project dependencies.
- `node_modules` stores installed packages.
- ESLint checks JavaScript and React code for potential problems.
- `main.jsx` starts the React application.
- `App.jsx` contains the main application component.
- JSX allows JavaScript components to describe what should appear in the browser.

**Why it matters**

This established the technical foundation for Orbit before introducing AI behavior.

---

## Adaptive Learning Prototype

**Built**
- Created a separate `StudySession` component.
- Built the first version of Orbit's learning loop.
- Added multiple-choice questions.
- Added different behavior for correct and incorrect answers.
- Added mastery tracking.
- Added a simpler follow-up question after an incorrect answer.
- Added the ability to continue into Question 2, Question 3, and additional questions.

The first prototype intentionally used hardcoded questions and responses so I could prove the interaction model before adding AI.

**Learned**
- `useState` stores values that can change while the application is running.
- Updating React state causes the interface to re-render.
- Props can pass information and functions between components.
- Event handlers can change several pieces of state after a user action.
- Breaking the study experience into its own component keeps `App.jsx` easier to manage.

**Why it matters**

This proved the adaptive study flow before adding model-generated behavior.

---

## Course Context and Materials

**Built**
- Added an initial multi-course structure.
- Added the ability to create new courses.
- Added course detail information.
- Added course material uploads.
- Added PDF syllabus support.
- Added syllabus information including:
  - course name
  - instructor
  - semester
- Added support for:
  - important course topics
  - upcoming assignments
  - quizzes and tests
  - recommended next actions
- Added safer handling for courses that do not yet have syllabus or file data.

**Learned**
- Browser file inputs return JavaScript `File` objects.
- Files can be converted to Base64 using `FileReader`.
- React arrays can be updated by mapping over existing state and replacing only the item that changed.
- Optional chaining can prevent crashes when data has not been created yet.
- Different courses may contain different amounts of information, so the application needs to handle missing data safely.

**Why it matters**

Orbit needs real context about what the student is responsible for before it can make useful learning decisions.

Course files are not meant to be the main product. They provide evidence Orbit can use when deciding what the student should do next.

---

## Secure Meta Muse Connection

**Built**
- Deployed Orbit to Vercel.
- Added Vercel serverless API routes.
- Stored the Meta Model API key as a Vercel environment variable.
- Connected the React frontend to server-side API routes.
- Connected the backend to Meta Muse Spark 1.3.
- Confirmed that the deployed application could successfully receive Muse responses.
- Kept the Meta API key out of browser code.

**Learned**
- How to structure a frontend-to-backend AI request securely in a deployed React application.
- How Vercel serverless functions can act as the protected layer between the browser and an external model API.
- How environment variables are accessed from server-side code in production.
- How to verify that the frontend can use an AI service without exposing the underlying secret.

**Why it matters**

Orbit's AI architecture now follows this flow:

**React frontend → Vercel serverless API → Meta Muse → Orbit**

The browser never receives the Meta API key.

---

## AI Syllabus Analysis

**Built**
- Added `/api/analyze-course`.
- Sent uploaded syllabus PDFs to Meta Muse.
- Asked Muse to return structured JSON.
- Extracted:
  - course name
  - instructor
  - semester
  - important topics
  - upcoming work
  - recommended next learning action
- Parsed Muse's response on the backend.
- Used the analysis to update Orbit's course state.
- Added logic to match an analyzed syllabus to the correct existing course instead of attaching it to whichever course Orbit currently recommends.

**Test**

I uploaded a test Biology 101 syllabus.

Orbit successfully identified:
- Dr. Maya Carter
- Fall 2026
- Mendelian genetics
- genotype vs. phenotype
- dominant and recessive alleles
- homozygous and heterozygous genotypes
- Punnett squares
- probability
- Genetics Quiz on October 28, 2026

Orbit also recommended reviewing the Genetics Prep Worksheet and practicing Punnett-square problems before the quiz.

**Learned**
- Model responses can contain multiple objects in addition to the generated text.
- The useful `output_text` can be extracted and parsed using `JSON.parse()`.
- Structured AI output is much easier for application code to use than conversational text.
- The course Orbit recommends studying and the course that owns an uploaded document are separate concepts.

**Why it matters**

Orbit can now turn a real student document into structured learning context.

---

## AI-Generated Study Questions

**Built**
- Added `/api/generate-study-question`.
- Added a `generateStudyQuestion()` frontend service.
- Used `useEffect` to generate a question when a study session begins.
- Sent Muse:
  - course information
  - recommended task
  - important topics
  - upcoming work
  - current mastery
- Replaced hardcoded study questions with Muse-generated questions.
- Replaced hardcoded answer choices with model-generated choices.
- Used `.map()` to render the generated answers as React buttons.
- Added loading states while Orbit generates a question.
- Added a Continue button that generates additional questions during the same session.

**Test**

After analyzing the Biology syllabus, Orbit stopped using the original hardcoded photosynthesis material and began generating genetics questions based on the uploaded syllabus.

One generated question tested inheritance probability using a Punnett-square scenario.

**Learned**
- `useEffect` can trigger an asynchronous setup action when a component first appears.
- `.map()` can turn model-generated arrays into interface elements.
- Optional chaining prevents the application from trying to use data before it exists.
- Loading states make AI requests clearer to the user.
- AI-generated learning content can remain grounded in course context instead of becoming a general chatbot conversation.

**Why it matters**

The study session is no longer scripted.

Orbit can generate new learning interactions based on what the student is actually studying.

---

## AI Evaluation and Adaptation

**Built**
- Added `/api/evaluate-study-answer`.
- Added an `evaluateStudyAnswer()` frontend service.
- Sent Muse:
  - the original question
  - the selected answer
  - the correct answer
  - relevant course topics
  - current mastery
- Generated personalized feedback after incorrect answers.
- Asked Muse to identify the likely misconception behind the wrong answer.
- Generated a simpler explanation based on that mistake.
- Generated an easier follow-up question testing the same concept.
- Generated follow-up answer choices dynamically.
- Updated mastery based on student performance.
- Used Muse's generated explanation after correct answers.

**Test**

Orbit asked a genetics question involving a heterozygous tall pea plant and a homozygous short plant.

I intentionally selected an incorrect `100%` answer.

Orbit recognized that the likely misconception was assuming that a dominant allele automatically appears in every offspring.

It changed the explanation and described the inheritance pattern as a simpler 50/50 allele choice.

Orbit then generated an easier follow-up question about the phenotype of a plant with genotype `tt`.

**Learned**
- An asynchronous click handler can wait for an AI response before updating the next part of the interface.
- A wrong answer contains useful information about what a student may misunderstand.
- AI can do more than generate content; it can evaluate performance and choose a different teaching strategy.
- Adaptive learning should change what happens next instead of only saying whether an answer was correct.

**Why it matters**

This created the first fully AI-driven version of Orbit's main learning loop:

**Learn → Quiz → Evaluate → Adapt → Continue**

Orbit is not only generating educational content. It is changing its behavior based on student performance.

---

## Multi-Course AI Prioritization

**Built**
- Added `/api/recommend-course`.
- Added a `recommendCourse()` frontend service.
- Sent all available courses to Muse.
- Asked Muse to compare:
  - deadlines
  - upcoming quizzes and tests
  - homework urgency
  - recommended tasks
  - available course context
- Asked Muse to select one course and explain why it should be prioritized.
- Added loading behavior while Orbit decides what the student should work on.
- Re-ran the recommendation whenever course state changes.

**Test**

Orbit compared:
- Biology — quiz tomorrow
- Algebra — homework due tonight
- History — test Friday

Muse selected Algebra because the homework deadline was the most immediate.

After additional Biology syllabus information became available, Orbit was still able to compare all courses instead of automatically prioritizing the newest uploaded material.

**Learned**
- AI becomes more agentic when it compares several possible actions and chooses between them.
- The model can use application state as decision-making context.
- A recommendation system should respond to changing course information rather than rely on a fixed course order.

**Why it matters**

Orbit can now decide what the student should work on across multiple classes instead of only responding inside one course.

---

## Course-Specific Mastery

**Built**
- Replaced one global mastery value with mastery stored inside each course.
- Added a default mastery score when new courses are created.
- Added `updateCourseMastery()` so only the course being studied changes.
- Passed the recommended course's mastery into `StudySession`.
- Verified that progress in one subject does not change the mastery of other subjects.

**Test**

The starting state was:

- Biology — 40%
- Algebra — 40%
- History — 40%

After correctly answering a Biology question:

- Biology — 80%
- Algebra — 40%
- History — 40%

**Learned**
- Student progress needs to belong to the course where the learning happened.
- Shared global state would incorrectly make progress in one class affect every other class.
- Updating one object inside an array can preserve all unrelated course data.

**Why it matters**

Orbit now has separate learning progress for each course.

This allows future recommendations to consider both urgency and how well the student understands each subject.

---

## Topic-Level Mastery Structure

**Built**
- Expanded each course's mastery from one number into a nested structure.
- Added:
  - overall course mastery
  - individual topic mastery
- Added initial Biology topic mastery values for:
  - Mendelian genetics
  - genotype vs. phenotype
  - dominant and recessive alleles
  - homozygous and heterozygous genotypes
  - Punnett squares
  - probability
- Updated new-course creation to use the same mastery structure.
- Updated course mastery changes so overall mastery can change without deleting topic mastery.

The current structure looks like:

```js
mastery: {
  overall: 40,
  topics: {
    'Mendelian genetics': 40,
    'Punnett squares': 40,
  },
}
```

**Learned**
- Nested objects can represent more detailed student progress.
- Object spread syntax can update one part of a nested object while preserving the rest.
- Overall course mastery is useful as a summary, but individual topic scores provide more useful information for deciding what should be taught next.

**Why it matters**

Orbit can eventually understand that a student may be strong in one part of a class and weak in another.

For example:

- Biology overall — 68%
- Punnett squares — 85%
- Mendelian genetics — 50%
- genotype vs. phenotype — 70%

That creates a much stronger foundation for adaptive learning than treating an entire class as one score.

---

# Current System

Orbit can currently:

1. Support multiple courses.
2. Create new courses.
3. Accept course materials as PDF files.
4. Send syllabus PDFs to Meta Muse.
5. Extract course information and important topics.
6. Identify upcoming assignments, quizzes, and tests.
7. Match uploaded course material to the correct course.
8. Ask Muse to compare multiple courses.
9. Recommend which course the student should work on next.
10. Explain why that course should be prioritized.
11. Start an AI-generated study session.
12. Generate study questions from real course context.
13. Generate multiple-choice answers.
14. Evaluate student responses.
15. Identify likely misconceptions after incorrect answers.
16. Change the teaching explanation.
17. Generate easier follow-up questions.
18. Continue into additional study questions.
19. Track mastery separately for each course.
20. Store overall mastery and topic-level mastery inside each course.
21. Reevaluate course recommendations when course state changes.

The current prototype uses:

- React
- Vite
- JavaScript
- Vercel
- Vercel serverless functions
- Meta Muse Spark 1.3

---

# Product Direction

Orbit is being designed around two possible learning situations.

## Structured Learning

A student already has a class.

Orbit can use:
- syllabi
- assignments
- quizzes
- exams
- deadlines
- uploaded materials
- course mastery
- topic mastery

to decide what the student should learn next.

## Self-Directed Learning

A user wants to learn a subject without having a formal course.

Examples could include:
- quantum physics
- music theory
- programming
- astronomy
- history

Instead of pretending the user can reach a fixed percentage of all knowledge in a huge subject, Orbit could create a learning path and track progress through the concepts included in that path.

The same adaptive engine could then:

**teach → quiz → evaluate → adapt → continue**

---

# Long-Term Orbit Goal

The long-term idea is similar to a dynamic version of Duolingo that can work for almost any subject.

Orbit should not require the user to constantly decide what to study.

Instead, it should maintain an evolving understanding of:

- what the user is learning
- what they understand
- what they struggle with
- what deadlines are approaching
- what they have already practiced
- what they should do next

Orbit should eventually be able to proactively check in with useful actions such as:

- reminding the student about an upcoming test
- asking whether they want help with an assignment
- giving a short pop quiz
- recommending a weak topic
- changing the study plan after mastery improves
- skipping material the student already understands

The goal is for Orbit to move with the learner instead of waiting passively for prompts.

---

## Home UI Foundation

- Established the first responsive Home composition: minimal navigation, one primary learning recommendation, and courses below the hero.
- Added a Home-scoped midnight and periwinkle palette, consistent spacing, readable typography, and keyboard focus treatments.
- Reserved open hero space for future companion and environment artwork; the empty scene collapses on smaller screens to keep the learning action first.
- Kept existing course, upload, study, and mastery behavior, with course information and course tools available through disclosures on Home.
- This is a structural foundation for visual review. Custom artwork, mascot design, motion, and other screen redesigns remain future work.

---

## October 27, 2026 — Learn Before Quiz

- Added an initial micro-lesson using the existing course context and topic mastery to guide Muse's topic selection.
- Added "I lost you" for a different teaching approach and "Give me an example" for one concrete example, keeping each response focused on a single concept.
- Connected "Quiz me" to the existing question workflow with the lesson context; later questions, evaluation, adaptive follow-ups, and mastery updates continue as before.
- Kept the active course stable while recommendations refresh, and added recoverable lesson/question errors.
- This is the first Learn stage only. Persistence, learning-style memory, learning paths, and a Study Mode redesign remain future work.

---

## October 27, 2026 — Conversational Learn Stage

- Added a compact freeform input for questions, confusion, and connections during Learn, with short replies grounded in the lesson, current example, and recent conversation.
- Kept the latest four complete exchanges in session memory and request context, showing the latest two beneath the lesson. Message and reply lengths are bounded on the server.
- Added tentative connection, confusion, curiosity, understanding, and neutral signals for the current session only; these labels stay out of the UI and do not change mastery.
- Kept all lesson shortcuts and the existing quiz flow. "Quiz me" can interrupt a pending conversation request; failed sends preserve the learner's message for retry.
- Reused the server-side Meta credential pattern. Persistence, learning-style memory, learning paths, and the dedicated Study UI redesign remain deferred.

---

## October 27, 2026 — Applied Activities in Learn

- Added "Let me try it" for one small activity grounded in the current lesson, topic mastery, and the latest four conversational exchanges. The activity gives a concrete action that can be answered inside Orbit in a few minutes.
- Added short conversational feedback with tentative applied-understanding, partial-understanding, misconception, curiosity, or neutral signals. Criteria and signals remain internal; activities do not update mastery or automatically advance the session.
- Kept only the current activity, response, and latest feedback in StudySession state. Conversation can refer to that attempt; requesting another activity replaces it after a successful response. Failed requests preserve learner input, and "Quiz me" can interrupt pending activity requests.
- Reused the server-side Meta credential pattern and existing Learn styles. No persistence, migrations, project library, external execution, learning paths, or visual redesign were added.
- Production build, focused lint, syntax checks, and all 42 mocked tests passed, including 15 new activity and integration checks. Full-project lint still reports five existing errors in unchanged API routes. Live Meta and browser/mobile verification remain manual.

---

## October 27, 2026 — Session Learning Anchors

- Added compact session anchors with type, topic, evidence summary, and tentative confidence. A shared helper retains up to eight useful anchors, updates redundant entries of the same type/topic, and selects at most three using the current topic, explicit concept connections, or recommended task.
- Conversation and applied-response evaluation may suggest an anchor when there is meaningful learner evidence. Adapted quiz evaluation may record a tentative misconception; follow-up choices refine that observation without claiming proven understanding. Generated content and routine correct choices do not create anchors.
- Explanations, examples, conversation, activities, quizzes, and adapted feedback receive relevant anchors through the existing services. APIs validate optional suggestions, discard malformed metadata without failing valid feedback, and filter incoming anchor context again before calling Meta.
- Kept anchors only in StudySession state, separate from the bounded conversation transcript and current activity. No visible memory UI, styling changes, mastery changes, new requests, database, migration, cross-session memory, or permanent learning-style labels were added.
- Production build, focused lint, syntax checks, and all 56 mocked tests passed, including 14 new anchor checks. Explicit Node process imports in the two touched quiz APIs resolved their existing lint findings; three unrelated errors remain in course analysis/recommendation. Live Meta and browser/mobile checks remain manual.

---

## October 27, 2026 — Learning Spaces & Product Shell

- Re-anchored the app in the existing nebula, brand, and companion assets. Added shared visual tokens, restrained desktop navigation, a scrollable learning-space list, a native mobile drawer, and a quieter Study frame with Learn/Practice progress.
- Replaced seeded demo courses with intentional first-use paths for a class, personal-interest topic, or PDF material. Learning spaces continue using the existing in-memory course shape; Home shows one next action and at most two alternatives. The interface explains that refresh clears spaces and progress.
- Added Library and a lightweight Calendar using existing uploaded `upcomingWork`. Complete ISO dates are sorted locally; ambiguous dates remain visible for review instead of becoming invented deadlines. Home previews at most three upcoming items. Uploads now target one selected space, retain its name, and expose pending/error/retry states.
- Kept Study mounted while visiting other destinations so the current lesson, conversation, activity, quiz, and session anchors can resume. Learning service/API contracts and topic-mastery fallbacks are unchanged. No dependencies, database, migrations, scheduling engine, or permanent learner memory were added.
- Added seven shell/calendar rendering and date checks. Production build, focused lint, all 63 tests, and diff checks pass. Full-project lint still reports three existing errors in unchanged course analysis/recommendation APIs. Browser review covers desktop first use, single-space Home and Study at a narrow viewport, mobile drawer navigation, live lesson/quiz generation, adapted feedback, follow-up mastery changing from 40% to 70%, and resuming the same quiz after visiting Home. PDF upload, full conversation/activity interaction, and physical-device checks remain manual; the existing mocked tests cover the unchanged learning services.

---

## October 27, 2026 — Visual Refinement & Study Stage

- Removed decorative headings, footer copy, setup filler, and full-width dividers. Home now leads with the actual recommended task or question; action labels derive from existing task text and session state without inventing missed work or adding requests.
- Recomposed desktop Study as a wider learning zone beside Orbit. Added a shared visual stage with separate environment, companion, teaching-object, and annotation layers; empty slots render nothing. Existing artwork only; no generated visuals or generation API.
- Gave mobile Study the order concept, visual strip, explanation, controls, input, then progress. Enlarged Orbit, softened mobile artwork crops, kept Home's mobile recommendation free of a full-screen glass panel, and adapted sparse pages to the same environment. Study drift is slower and smaller than Home and disabled for reduced motion.
- Preserved navigation, date handling, learning request/response contracts, session retention, quiz callbacks, and mastery fallbacks. No dependencies, database changes, migrations, scheduling engine, or persistent memory.
- Production build, focused lint, all 65 tests, and diff checks pass. Full-project lint retains three existing errors in the unchanged course-analysis/recommendation APIs. Browser review covers desktop and 399px/500px layouts, Home, Study, Calendar, Library, Space and New space, drawer/Escape, visible keyboard focus, reduced-motion emulation, live lesson/example generation, and resuming existing study state. Zero/many-space and date grouping cases are also covered by rendering tests. Physical-device testing, PDF upload, and exhaustive live conversation/activity/retry checks remain manual.

---

## October 27, 2026 — Focused Study Threads & Course Position

- Added one active Study interaction with compact history, showing only the latest conversational exchange. In-memory threads retain their mounted lesson, drafts, activities, anchors, and quiz feedback when navigating or switching objectives. Thread titles and summaries derive from existing learning content without extra model calls.
- Added runtime local-date inference over past, current, future, and uncertain syllabus items. Starting priority is explicit learner position, current dated unit, upcoming work or weak mastery, then a useful inferred concept. Learner corrections and skip/not-yet constraints take precedence; unclear timelines ask for a starting point. Adding materials preserves earlier syllabus and assignment context.
- Passed bounded course-position context to recommendations and study generation, retaining the existing bounded conversation/anchor context and topic-mastery compatibility fallback. Strengthened action surfaces and hover/focus feedback without changing the background, sidebar structure, OrbitStage, or artwork.
- Production build, full-project lint, JavaScript syntax checks, all 85 tests, and diff checks pass. Date/override tests cover October versus old orientation, invalid/yearless dates, month boundaries, preserved past material, and stale model output. Rendering tests cover zero, one, and multiple spaces. The prior lint findings in the touched course-analysis/recommendation routes are resolved.
- Live browser review covered desktop first use and lesson generation, a five-turn conversation at 375px, a quiz using an earlier learning connection, adapted feedback, mastery moving from 40% to 70%, creation of a second thread, and returning to the first thread with its answered quiz intact. Live PDF extraction, exhaustive draft/activity switching and error retries, and physical-device checks remain manual.
- Updated Unreleased release notes and manual checks. No dependencies, database, migrations, persistence, authentication, or security-policy changes. Accounts, permanent history, calendar editing, notifications, generated visuals, achievements, and broad learning paths remain deferred.

---

## October 27, 2026 — Local Learner Memory & Mobile Navigation

- Added a versioned, allowlisted localStorage snapshot restored before the first Home render. It keeps space identity/type, extracted syllabus and work dates, file metadata, course/topic mastery, structured learner corrections, a recomputed position snapshot, bounded anchors (including tentative teaching preferences), recent learning context, thread metadata, and the last valid recommendation. Invalid or incompatible snapshots fall back safely; unavailable/full storage leaves the running session usable and shows a save warning.
- Save limits: 20 recent threads while retaining the active one, eight anchors per space/thread, one compact lesson and two recent exchanges per saved thread (600 characters per learner message and 900 per response). Live conversation is bounded to four exchanges and interaction history to 12 entries. No raw uploads, full transcripts, unsent drafts, quiz/activity screens, credentials, or arbitrary state fields are serialized. The total snapshot is capped at one million characters; storage failures preserve the last successful snapshot.
- Home uses explicit correction, recent learner state, mastery/anchors, dated syllabus context, then inferred ordering. Recent state is eligible for two weeks and only while its correction context still matches; explicit corrections remain until changed. Dates are recomputed on return. Resumed threads show their prior summary and lesson; activities and quizzes start fresh after reload without awarding mastery again. Unopened restored threads do not generate lessons.
- Existing Meta endpoints receive only relevant position/anchor context. Recommendation requests omit file data and transcripts and do not refetch for every summary change. Library explains device-local storage and includes a two-step reset that removes only Orbit's key and clears active learning state. Anyone using the same browser profile can access the local memory; browser data clearing removes it. No account security, encryption, or cross-device sync is claimed.
- Moved the mobile drawer trigger immediately before the Orbit brand, using a three-line icon, a 44px target, an accessible Open navigation label, expanded state, and the existing hover/pressed/focus treatments. Kept the native modal drawer and its Escape/focus behavior. No changes to OrbitStage, artwork, or desktop navigation structure.
- Validation: production build, full lint, all 101 tests, and diff checks pass. New tests cover zero/one/seven-space storage round trips, App hydration, restored lessons/summaries, malformed/versioned state, corrections and priority, mastery, anchors/preferences, bounds, reset, failed storage, omission of credential/upload fields, and minimal service context. Existing mocked learning, conversation, activity, quiz, and mastery checks continue to pass. Earlier test failures reflected the changed priority/copy/contracts and were updated; a new synchronous-effect lint finding was fixed.
- Live browser verification was attempted but the computer-use tool stopped because it could not confidently determine the Windows browser URL. No browser or physical-device testing is claimed for this milestone; real reload interaction, live Meta/PDF flows, reset confirmation, and mobile open/close/Escape/focus remain on the manual checklist. No dev server was started. The browser connection inventory was also unavailable; a shell listener inventory was denied by the environment and was not needed for the code checks.
- Updated Unreleased notes and manual checks. No dependencies, authentication, database, migrations, historical migration edits, manual SQL, new external services, or backend persistence. Accounts, cloud sync, production profiles, social features, collaboration, and unlimited history remain deferred.

---

## October 27, 2026 — Consistent Page Composition

- Moved Home and Learn onto the existing non-Study page grid, with shared width, top spacing, heading scale, content/stage gap, and utility spacing. Removed Learn's redundant stylesheet. Home keeps its recommendation surface while its text aligns with other pages; entry buttons reuse the shared button treatment. Reserved consistent resume-bar space across non-Study routes during an active session.
- Unified Home/page companion dimensions and placement, removed their extra nebula image layer, and standardized mobile ordering as companion, heading, then content. Kept Study's stage, layout, and motion treatment intact. Separated Library's local-memory explanation and reset controls without changing confirmation behavior.
- Validation: production build, full lint, all 108 existing tests, and diff checks pass. Desktop screenshots at the same maximized Chrome viewport cover Home, Learn, Calendar, Library, New Space, and a populated Space. Confirmed matching heading/content anchors and companion scale/region, no extra background rectangle, Library confirmation/cancel, space creation, and visible input focus. Home was also inspected in an approximately 500px-wide browser window.
- Browser automation then stopped on refresh because it could not determine the Windows browser URL confidently enough to enforce policy. Remaining mobile routes, drawer/reduced-motion checks, the final populated-Home button-spacing fix, and the active-session notice reservation still need browser review. No live API, PDF upload, physical-device, or complete end-to-end behavior testing is claimed; the preview serves the frontend only.
- Updated Unreleased notes and manual checks. No new dependencies, artwork, APIs, authentication, persistence logic, database changes, migrations, or manual SQL.

---

## October 27, 2026 — Guided Adaptive Lessons

- Added a small, revisable learning path to each study thread: current lesson, two tentative next lessons, eight recent visited lessons, and a lesson counter. "I understand" records self-reported readiness; "Continue to next lesson" advances without requiring a quiz or changing mastery. Quiz continuation is labeled "Next question" to distinguish it from lesson progression.
- Extended the existing lesson service/endpoint with a next-lesson action. Guided generation uses extracted syllabus/assignment context and explicit course corrections before inferred activity, reconsiders suggestions with current mastery/anchors, and rejects repeated recent concepts and disallowed topics. New evidence invalidates future suggestions without interrupting the current lesson. Existing Home inference and legacy API contracts remain compatible.
- Kept lesson identity visible across conversation and practice. A successful transition resets lesson-specific controls while retaining anchors and bounded history; failures retain the current interaction and drafts. Corrections arriving during a request prevent installation of the stale result. Successfully continuing at a corrected position updates the thread's resume identity, with one added App prop carrying the actual course correction key.
- Added a small React text renderer for headings, paragraphs, bullets, and bold emphasis; raw HTML and image/link syntax remain inert. Muse prompts request a compact explanatory idea and concrete example, avoiding course-title definitions and repeated UI labels.
- Added optional allowlisted visual metadata (type, teaching purpose, bounded labeled data, and focus) for future teaching visuals. No visual generation/rendering, mascot changes, new dependencies, or graphics system. The existing local-memory projection retains the path and optional visual metadata; older saves load with an empty path. No database, migrations, historical migration edits, manual SQL, cloud persistence, or authentication changes.
- Validation: production build, full lint, and 123 tests pass, including new API/service progression, course-evidence revision, unclear-position recovery, bounds, safe formatting, rendered UI, and local-resume checks. A new test initially used an unsupported anchor confidence value; the fixture was corrected to the existing contract. Browser/live Meta and physical-device verification remain manual; no interactive dev server was started. Updated Unreleased release notes and the manual checklist.

---

## October 27, 2026 — Study Composition & Navigation Cleanup

- Brought active Study into the shared page width, top spacing, column proportions, heading scale, stage dimensions, and responsive spacing. Removed the remaining masked nebula copy from OrbitStage; existing transparent artwork, gentle drift, and reduced-motion behavior remain unchanged.
- Removed the stacked Back home/course row and global resume banners, including their reserved space. Kept the course/lesson context and existing Home/Learn resume behavior. Grouped the collapsed Study threads control with a compact plus/New thread action; thread creation and persistence logic are unchanged.
- Validation: production build, full lint, all 123 existing tests, and diff checks pass. Browser review on the existing local app covered desktop and an approximately 500px-wide window: active lesson, long title wrapping, mascot/background, lesson actions, progression controls, thread-history expansion/collapse, new-thread form open/close, and mobile navigation. Calendar/Library have no session banner; Learn and Home's contextual return reopen the same Music theory lesson. No new server was started.
- Narrower phone sizes, physical devices, reduced-motion emulation, and full live generation/quiz/activity flows remain manual. No lesson logic, prompts, learning paths, mastery, API contracts, storage logic, dependencies, artwork files, database, or migrations changed. Updated Unreleased notes and manual checks.

---

## October 28, 2026 — Adaptive Study Path

- Reused the existing lesson path, interaction state, and local resume to show a compact current/visited/next treatment. The full bounded path expands on demand; phones hide the visited preview and keep the current step and one next idea visible. All five interactions remain in a collapsible Study tools control, with "I lost you" directly on the lesson.
- Added deterministic next-step guidance after the content. Fresh lessons encourage reading then an example; examples suggest applying the idea; submitted activity feedback suggests a quiz or extra support; incorrect quizzes prioritize the existing adapted explanation/follow-up; successful practice or self-reported readiness can suggest continuation. Unfinished responses stay focused on their form. Every recommendation is optional, and moving through lessons still does not award mastery.
- Kept existing request cancellation, thread resume, history, lesson progression, mastery fallbacks, lesson prompts, and visual metadata. First-question retries now retain the current lesson context. No new requests to select guidance, dependencies, database, migrations, manual SQL, or persistence schema changes. Visual rendering and image generation remain deferred.
- Validation: all 130 tests, full lint, production build, and diff checks pass. Coverage includes missing/stale path data, current/visited/next rendering, recommendation precedence, edited activity responses, generation retries, and saved-path progression/resume, alongside the existing mocked lesson/activity/conversation/quiz suites. Browser inspection of the already running local app covered desktop and a 320px responsive preview, long-title wrapping, collapsed/expanded study tools, conversation access, and returning to the same lesson, with no visible horizontal overflow. Live Meta-backed flows, a physical phone, and complete keyboard/reduced-motion checks remain manual; the existing tab uses plain Vite without an API proxy. No new dev server was started.

---

## October 28, 2026 — Orbit Thinking Experience

- Extended the shared Orbit stage with deterministic context for lessons, examples, activities, replies, quizzes, evaluations, and Home recommendations. The existing request flag controls the thinking face independently of visible content, leaving room for future streaming without implementing it.
- Added a slow, restrained sway and a brief return from the current angle to rest using browser transform animation. Two short drifting thoughts and three faint traveling dots fit inside the existing stage; mobile shows one thought without increasing stage height. Reduced motion leaves the face and context static, including when the preference changes during a request.
- Replaced duplicated visual loading paragraphs with one persistent polite status per stage; decorative thoughts and dots stay out of the accessibility tree. Existing lesson content, request handlers, cancellation, retries, mastery, and local persistence are unchanged. No new API calls, backend changes, dependencies, artwork, database changes, migrations, or manual SQL.
- Validation: all 139 tests, full lint, production build, and diff check pass. New coverage checks context selection, asset switching, single-status rendering, visible content during thinking, interrupted settling, quick retries, preference changes, and motion cleanup. An initial syntax error in a new test was corrected before the successful runs.
- Browser visual verification could not be completed: Windows Computer Use stopped because it could not confidently determine the browser URL. The temporary local review page was removed. Desktop/mobile animation appearance, real screen-reader announcements, and live AI loading/failure flows remain manual. No new dev server was started. Updated Unreleased notes and the manual checklist.

---

## October 28, 2026 — Varied Thoughts & Streamed Conversation

- Expanded each thinking context to six short phrases. A component-local request sequence selects two phrases, stays stable through chunk/content rerenders (including StrictMode), and rotates on the next request. Mobile still shows one. Removed the decorative trail markup and animation while preserving the existing assets, sway, settling, status announcements, and reduced motion. Handled the expected animation-finished rejection when a request change cancels motion.
- Added opt-in streaming only to Talk It Through using Meta's documented `muse-spark-1.3` Responses SSE events. The same prompt/context and bounded history are retained. A small server parser decodes the first response JSON string as text arrives; only visible deltas reach the client. Full JSON, response length/word limits, signals, and anchors are validated before a distinct completion event. Existing non-streaming helpers and other structured actions retain their contracts.
- The frontend reads bounded NDJSON delta/complete/error events and updates temporary text per incoming chunk. Partial Markdown is escaped plain text until completion, then uses StudyContent. The thinking flag stays active through final metadata. Failed/incomplete output is discarded, the learner draft remains, and retries cannot commit duplicate exchanges. Quiz switches and unmounts cancel the stream. Existing four-exchange history and two-exchange local resume projection are unchanged; only complete replies and validated anchors enter persistence.
- Enabled Vercel cancellation for this route only; client disconnects abort the upstream request and release the reader. Streaming requests disable provider storage and do not expose raw Meta events or credentials. No databases, migrations, historical migration edits, manual SQL, auth changes, image generation, visual lesson rendering, or other feature streaming.
- Added happy-dom as a development-only dependency for real React interaction tests; production dependencies are unchanged. Validation: all 153 tests, full lint, production build, backend syntax checks, and diff checks pass. Tests cover early deltas, UTF-8/JSON escape and frame boundaries, withheld metadata, malformed/failed/truncated streams, abort during stalled reads, stable/rotating phrases, no trail, partial rendering, request lifetime, retry, quiz switch, unmount, save-once behavior, and final anchor/resume round trips. Initial test-environment cancellation rejection, metadata-count assumptions, and a test lint issue were resolved before these passing runs.
- Meta streaming support was verified against official documentation, not a live credentialed request. Browser/device layout, real screen-reader behavior, and deployed/live Meta streaming remain manual. No interactive dev server or browser automation was started. Updated README, Unreleased notes, and manual checks.

---

## October 28, 2026 — Inline Orbit Signal & Paced Replies

- Added a reusable OrbitSignal and OrbitResponse wrapper using the existing Orbit mark and contextual copy. A small lavender phrase sits above a 260px line (220px on phones, capped by available width); a soft gradient travels along it only when reduced motion is not requested. The shared mascot, sway, and single loading announcement are unchanged. Prior structured results remain hidden and inert in the same grid cell to preserve their footprint while a replacement loads.
- Applied the Signal to initial/next lessons, simplification, examples, activity generation/feedback, quiz generation, and incorrect-answer recovery. These requests remain non-streaming. Next-question replacement now retains the prior question until success, including its footprint and recoverable state on failure. Existing mastery and adaptive path rules are unchanged.
- Talk It Through now renders one current submitted thought and one response slot: Signal, temporary streamed text, then formatted StudyContent. Restored exchanges also populate the existing bounded history. Submission scrolls the current turn into view only when needed, accounting for the visual viewport, and never scrolls for text chunks. Failed or cancelled partial output is discarded; drafts and existing retry behavior remain available.
- Isolated the display buffer from network parsing. It receives real deltas immediately and reveals two or three words per 110ms tick, capped at 48 Unicode code points, holding trailing partial words until a delimiter or completion. Bursts drain gradually, slower network data causes an idle wait, and short replies finish in one tick. Final formatting, conversation history, and anchor persistence wait for validated network completion and display drain. Abort/unmount cancels queued display work.
- Validation: all 166 tests, full lint, production build, and diff check pass. Coverage includes every request context and result slot, hidden/inert replacement content, resumed history, immediate submitted thoughts, burst pacing, final drain, save-once behavior, failures, retry, abort during streaming/drain, unmount, and one-time scrolling. CSS contracts and simulated viewport/motion preferences cover responsive and reduced-motion rules. A computed-width test initially failed because happy-dom does not resolve CSS min()/percentage layout; that assertion now checks the CSS rule and matching viewport directly.
- No new dependencies, assets, API calls, server changes, database changes, migrations, historical migration edits, manual SQL, or auth changes. Updated README and Unreleased release notes/manual checklist. Browser/device appearance, actual screen-reader announcements, mobile keyboard scrolling, and live Meta streaming remain manual; no interactive dev server or browser automation was started.

---

## October 28, 2026 — Conversational Study Transcript & Message Surfaces

- Reworked Talk It Through into a chronological transcript of the four retained exchanges plus the pending turn. Older exchanges alone move into the bounded, collapsed history below Suggested next; lesson transitions archive the remaining discussion. Saved resume continues to retain two exchanges, with no schema changes. Study interactions remain separate from the conversation.
- Removed visible speaker headings. Learner inputs use compact, right-aligned, muted bubbles; Orbit replies use full-column navy/lavender gradients, a restrained border, and a soft glow. Signal, partial text, and formatted results share that same response bubble. Mobile reduces padding and lets replies use the available width. The composer is lightweight and stays in normal document flow, with its accessible label retained and multiline keyboard semantics unchanged.
- Send captures a pending turn and immediately clears the textarea. Failure restores the submitted message beside the failed turn; switching to Quiz restores a cancelled draft. Only fully completed replies enter conversation history or persistence. Recent exchanges remain directly visible and are not duplicated in collapsed history.
- Removed the hidden-content grid that reserved the entire old result height. Signals now take only their own compact height. All eight structured result types use a separate display-only reveal after the existing full response arrives. Short results skip staged text; longer results finish within 630ms, with primary text first and controls appearing with the final result. Interrupted reveals cancel their timers. Course-context checks still reject stale next lessons.
- Revised true streaming presentation to an 80ms base cadence, two to five words per group, a 64-code-point cap, and small punctuation pauses. Larger backlogs catch up faster while trailing partial words wait. Reduced motion keeps the loading cue static and displays completed text promptly, including when the preference changes during a reveal. Progressive text is hidden from assistive technology, completed conversation replies use one live response region, and the mascot retains the single loading status.
- Validation: 175 tests, full lint, production build, and diff check pass. Tests cover composer clearing/retry/cancel, chronological recent turns, history without duplicates, unchanged bounded resume, one shared pending/final bubble, compact loading, adaptive pacing, structured reveals and control timing, reduced motion, unmount cleanup, safe mobile CSS, and existing Study interactions. Earlier assertions for the superseded single-turn view and reserved-height loader were updated to the new behavior.
- Visually inspected the existing local Chrome session on desktop and at a phone-sized effective viewport using browser zoom, then restored the zoom. Confirmed label-free message ownership, restrained Orbit surfaces, wrapping, and the responsive full-width layout. No new dev server or live AI request was started. Real phone keyboards, screen readers, and live generation/retry timing remain manual checks.
- Updated README and Unreleased product notes/manual checks. No new dependencies, AI calls, prompts, backend formats, database/auth changes, migrations, historical migration edits, or manual SQL. Mascot placement, learning-path logic, and mastery logic remain unchanged.

---

## October 28, 2026 — Native Visual Learning V1

- Added a reusable LessonVisual renderer for diagrams, ordered processes, comparisons, and schematic concept illustrations. Native HTML/CSS/SVG objects use Orbit's blue/violet palette, luminous outlines, restrained gradients, and occasional warm/green accents. Readable HTML labels, details, and directed relationship descriptions accompany the decorative SVG. Visuals are static, so reduced motion needs no alternate illustration.
- Moved the existing compact path beneath the course/lesson context and before the lesson title. Lessons with visuals share text and illustration columns on wide screens; tablet and phone layouts stack them before learning controls. The companion becomes a small desktop guide and is hidden on illustrated phone lessons while its existing accessible request status remains. Collapsed Study tools follow the active content; adaptive recommendations, progression, mastery, and interaction handlers are preserved.
- Extended the existing visual metadata with optional allowlisted symbols and bounded, explicitly labelled links. The existing lesson prompt explains those fields and process ordering; no extra request was added. API responses, native rendering, and the existing local resume projection use the same validation. Legacy metadata remains usable without invented relationships; invalid, absent, unsupported, none, and generated-image visuals render no panel. Schematic molecule objects deliberately avoid suggesting atom counts or bond geometry.
- Validation: all 186 tests, full lint, production build, API/service syntax checks, and diff checks pass. Added rendering/fallback/accessibility coverage, malformed-link and markup rejection, API/resume round trips, and a mounted Study test that switches tools and continues to a new visual without extra requests or mastery changes. Existing recommendation and Study Path coverage remains passing.
- Inspected an isolated sample-lesson page in the existing local Chrome/Vite session at exact iframe viewport widths of 320, 768, and 1440 pixels. Measured document widths matched those viewports. Reviewed concept illustrations, stacked phone comparisons, vertical phone/tablet processes, and desktop diagrams; tightened diagram spacing afterward. Temporary review files were removed. No live Muse generation, real screen-reader, physical-device, or complete keyboard/reduced-motion walkthrough was performed; these remain in the manual checklist. No new dev server was started and saved learner data was not changed by the review page.
- Updated README and Unreleased product notes/manual checks. No new dependencies, external illustration assets, image calls/routes, accounts, database, migrations, historical migration edits, manual SQL, or new persistence mechanism. Muse Image/generated imagery, a notebook/save action, a new takeaway summary, and animated teaching scenes remain deferred.

---

## October 28, 2026 — Native Visual Routing

- Strengthened lesson selection to actively consider whether visuals improve understanding, with mechanisms, processes, systems, spatial relationships, and comparisons favored while recall/vocabulary may remain text-only. Extracted shared native type/schema guidance for both teaching routes and removed the response example that defaulted to none. LessonVisual and its styles are unchanged.
- Talk It Through now knows native visuals are available, rules out false inability/imaginary-picture language, and defaults to text unless a visual is requested or useful. A validated current visual can be reused; a different explanation can supply a new specification. Optional visual metadata returns alongside the existing response/signal/anchor in one request and uses the existing normalizer. Streaming releases visuals only at validated completion; the bounded completion frame accommodates JSON escapes and reused context without changing field limits.
- StudySession displays one supplemental visual beneath the discussion using the existing renderer/mobile rules, only after the reply finishes. Invalid metadata preserves text and any previous valid visual; interrupted replies cannot install a new visual. Tool switches retain it, successful simplification/continuation clears it, and refresh does not restore it. Existing lesson resume, discussion persistence, mastery, quiz/activity behavior, and Adaptive Study Path remain unchanged.
- Added explicitly development-only routing diagnostics for source, response/display phase, concept presence, requested/normalized type, and display status. No concept text, learner payloads, prompts, labels, or credentials are logged.
- Validation: all 199 tests, full lint, production build, API/service syntax checks, and diff check pass. Added prompt selection/capability coverage, native reuse and alternatives, invalid/none/deferred fallbacks, streaming metadata/framing, completion/cancellation timing, tool/lesson transitions, and refresh boundaries. No validation failures remain. Browser/live Muse, real 320px layout, and physical-device checks were not performed for this routing change; the photosynthesis/request/reuse/alternate/refresh scenario is in the manual checklist.
- Updated README and Unreleased product notes/manual checks. No dependencies, extra AI/image requests, renderer redesign, database, migrations, historical migration edits, manual SQL, accounts, or new persistent state. Muse Image/image generation and persisted conversation visuals remain deferred.

---

## October 28, 2026 — Native Composition & Lesson Presenter

- Replaced numbered rectangle scenes and detached numbered legends with labelled native objects. A small topology-based selector supports one-to-many branches, many-to-one merges, connected flows, focused input/system/output hubs and mechanism scenes, explicit nested containment, and conservative collections/relationship keys. No subject-name or keyword routing is used, and no scientific relationship is invented.
- Processes use ordered symbols and optional supplied transition labels; long/narrow sequences recompose vertically. Comparisons retain separate illustrated regions without flow arrows. Concept illustrations emphasize their focal object and arrange actual inputs/outputs around it, including schematic light/water placement. Added only leaf and note to the existing primitive vocabulary. Shared guidance now encourages meaningful objects and actual relationship structure rather than sequential boxes for unrelated inputs.
- Kept the existing metadata/routing architecture. Backward-compatible additions are allowlisted leaf/note symbols, process links for labelled transitions, and optional contains link kind for explicit containment trees. Invalid optional hints are stripped; malformed graph data still follows existing safe fallback rules. The normalizer remains shared by API, conversation, renderer, and existing resume projection.
- Replaced distance-based curved arrows with measured symbol endpoints and gutter paths that update on resize. Container queries recompose visuals within their available column, including conversation visuals. Labels remain readable HTML; SVG is decorative. Replaced the large automatic focus outline with a small visible marker. No new visual animation was introduced.
- Moved the existing companion beside the lesson illustration (210px desktop, 150px tablet), preserving the hidden phone treatment, current artwork, request-driven thinking pose, and single loading status. Pending replacement keeps a separate reserved presenter area so it cannot cover the response. Other Study interactions, mastery, adaptive recommendations, and conversation visual state are unchanged.
- Validation: all 206 tests, full lint, production build, syntax checks, and diff check pass. Coverage includes updated renderer assertions and new topology, intervals, containment/cycle fallback, optional metadata, connector geometry, responsive structure, and thinking-presenter behavior. Initial assertions for old node/legend/direct-figure markup were updated to the new structure. Vite emitted a non-failing HMR port 24678 already-in-use warning during the parallel test suites; no test failures remain.
- Manually inspected isolated mocked process, branching/reuse, physical mechanism, comparison, and longer sequence examples in the existing Chrome/Vite session at 320px, 768px, and 1440px. The previews had no horizontal document overflow; directional paths, label placement, mascot sizing/hiding, and phone recomposition were checked. Fixed a narrow long-sequence connector offset found during review. Closed the preview, restored the browser window, and removed temporary review files. No new dev server or live AI call was made, and saved learner data was not changed by the isolated preview. Live Muse output, physical devices, and screen-reader verification remain manual.
- Updated README and Unreleased product notes/manual checks. No dependencies, image-generation APIs, Muse Image, database changes, migrations, historical migration edits, manual SQL, account changes, or new persistence mechanism. Generated imagery, elaborate scene languages, and additional motion remain deferred.

---

## October 30, 2026 - Muse Image Lesson Output

- Preserved Spark's optional teaching-value routing while replacing the learner-facing native renderer with generated instructional images. Both teaching routes and both conversation response paths now accept generated_image; older saved native briefs adapt to that path. The shared bounded brief retains purpose, elements, focus, explicit relationships, optional composition, and a short conceptual recovery context.
- Added POST /api/generate-lesson-image and generateLessonImage() in src/services/lessonImages.js. The server uses the existing MODEL_API_KEY with muse-image-1.0 at /v1/images/generations, n: 1, WebP, and URL responses. Verified the request shape against Meta's image-generation documentation. Image search, web search, and shell are explicitly disabled. The provider timeout is 180 seconds, the client timeout 195 seconds, and the function duration 200 seconds. No full transcript or unnecessary course/learner data enters the image prompt; response errors do not relay provider details.
- StudySession owns a request-keyed memory cache shared by lesson and supplemental conversation views. Pending/completed/failed requests survive rerenders, StrictMode, tool switches, and mounted thread/Home navigation. Inactive restored threads defer generation. The request includes the current explanation, so meaningful changes clear the visible image immediately and late responses cannot replace a different request. Failures require explicit retry; image-load errors remove the img without any SVG/planet fallback. Loading is local to the visual and does not lock unrelated Study controls.
- Generated assets and URLs are not saved to localStorage. Existing resume keeps only the bounded lesson brief; supplemental conversation visuals remain session-only. Full refresh starts a new cache and may generate the restored lesson image again. Temporary signed URL lifetime is not assumed; expired images offer retry. Returning only an HTTPS URL avoids forwarding image bytes through Vercel's response limit. Cross-session deduplication and durable image history remain outside this first implementation.
- Kept the old renderer in src/components/LegacyLessonVisual.jsx with its composition helper, native selector, scene CSS, fixtures, and tests for rollback/reference. It has no learner-facing imports. The existing Study layout, conversation behavior, mastery, quizzes, activities, course position, and path progression remain intact.
- Validation: all 219 tests pass (13 new image API/cache/mounted UI tests plus updated routing/streaming assertions), full lint and production build pass. Coverage includes no-visual gating, the server-only provider call, safe failures, actual img rendering/load errors, StrictMode/request reuse, stale response isolation, inactive resume, context bounds, and no asset persistence. Existing parallel Vite tests emit a non-failing HMR port warning. No app dev server, browser automation, live Meta request, physical-device check, or manual image-quality review was performed.
- Final checks: API/service syntax checks and git diff --check pass. The built production JavaScript contains no MODEL_API_KEY, provider endpoint/model identifiers, or legacy SVG renderer markers.
- Changed files: api/generate-lesson-image.js, api/generate-study-lesson.js, api/respond-to-study-message.js, api/_lib/lessonVisualPrompt.js; src/services/lessonImages.js, lessonImageRequest.js, learningPath.js, meta.js, studyConversationStream.js; src/components/LessonVisual.jsx, LessonVisual.css, LegacyLessonVisual.jsx, StudySession.jsx; vercel.json; tests/lesson-images.test.js, lesson-images-ui.test.js, lesson-visual.test.js, learning-path.test.js, study-conversation.test.js, study-streaming.test.js, study-streaming-ui.test.js; README.md, CHANGELOG.md, BUILD_LOG.md.
- Updated README and Unreleased product notes/manual checks. No new dependencies, database changes, migrations, historical migration edits, or manual SQL. No separate image key or client credential is required; the existing server key needs Muse Image access in the relevant environment. Adaptive generative UI, image editing, and durable image persistence remain deferred.

---

## October 30, 2026 - Controlled Adaptive Study Presentation

- Added five authored Study compositions: focus, visual, practice, check, and recover. A pure selector in src/services/studyPresentation.js derives the mode, reason, primary action location, and guidance; a small useStudyPresentation hook subscribes to the existing image cache without starting or changing requests. Model output cannot provide layouts, markup, components, styles, or class names.
- Priority is active recovery, active quiz, active activity, usable/pending current image, then focus. Recovery is scoped to the selected interaction: I lost you, an active incorrect-answer explanation/follow-up, matching misconception/partial-understanding activity feedback, or the latest completed conversation confusion signal. Old results cannot override another active tool. Editing an activity response returns to practice; resubmitting unchanged feedback retains recovery while pending. A successful follow-up returns to check. That helps ends lesson recovery without changing readiness, mastery, or saved memory; successful continuation clears it, while failed continuation preserves it.
- Visual mode gives the instructional image the larger desktop column with a compact companion. The image uses a stable 3:2 dark frame and contain sizing to keep the full opaque source visible without cropping, blending, background removal, or text overlays. Generation/decode keep the same mode; errors use the appropriate nonvisual layout and existing explicit retry. Recovery stacks supporting images under the explanation. Tablet visual layouts stack; phone task layouts prioritize content and preserve the accessible request status while hiding artwork. Focus retains a compact full mascot. No layout animation was added.
- Activities and questions now lead their own compositions, with a closed Lesson context disclosure. Recovery narrows the active task, emphasizes activity feedback, and collapses older conversation exchanges without deleting them. Shared navigation, history, threads, draft state, scoring, mastery, course positioning, learning-path advancement, local memory rules, credentials, image APIs, cost/deduplication logic, and legacy native visuals are unchanged.
- Validation: all 235 tests pass, including 10 new selector tests and 6 mounted UI tests. Coverage includes active-interaction precedence, pending/error/retry behavior, next-lesson reset/failure, recovery exits, retained discussion/drafts, stable keyboard focus, image request reuse, and unchanged score writes. Updated old mascot-placement and heading assertions. Full lint and production build pass; no validation failures remain.
- Browser review was attempted through the computer-use tool but blocked by an app-approval timeout before any page review. Temporary isolated review files were removed. No new dev server, live Meta request, image-quality review, physical-device check, or screen-reader walkthrough was performed. README documents the architecture and exact priority; CHANGELOG Unreleased includes product notes and the ordered 1440px, 768px, 390px, and 320px manual sequence.
- No dependencies, database changes, migrations, historical migration edits, manual SQL, new persistence, or new AI APIs. Learning Profile/ADHD preferences, Show me, and legacy-renderer removal remain deferred.

---

# Next

The next major development steps are:

- Connect generated study questions to specific topic mastery values.
- Update individual topic mastery based on student performance.
- Use both deadline urgency and mastery when Muse chooses what the student should study next.
- Let overall course mastery reflect topic-level performance more intelligently.
- Replace the current prototype interface with the final Orbit visual system.
- Design the main recommendation experience around the learning agent rather than a traditional education dashboard.
- Add the Orbit companion character.
- Make study sessions visually focused and remove prototype/debug information during learning.
- Evaluate optional production persistence and sync after the local-first demo; original uploaded files are not currently retained across refreshes.
- Explore proactive Muse-powered check-ins, reminders, and pop quizzes.
- Add a future self-directed learning mode for subjects without a formal syllabus.
- Prepare the final hackathon demo around Orbit's decision-making and adaptive behavior.
