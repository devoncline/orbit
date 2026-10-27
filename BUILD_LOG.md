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
- Add persistence so courses, files, mastery, and learning progress survive page refreshes.
- Explore proactive Muse-powered check-ins, reminders, and pop quizzes.
- Add a future self-directed learning mode for subjects without a formal syllabus.
- Prepare the final hackathon demo around Orbit's decision-making and adaptive behavior.
