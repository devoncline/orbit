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

Orbit currently uses gentle floating motion and can shift into a thinking state while preparing a response.

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
- [x] Orbit visual identity
- [x] Orbit companion artwork
- [x] Atmospheric learning environment
- [x] Responsive desktop/mobile UI
- [ ] Deeper adaptive learning behavior
- [ ] Dynamic learning visuals
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

A major direction for Orbit is making explanations more visual and interactive.

The goal is not simply to place a static diagram inside a card.

Instead, parts of the learning environment could eventually respond to what is being taught.

Visuals may help show:

- relationships between concepts
- sequences and processes
- spatial ideas
- changes over time
- cause and effect
- abstract ideas that are difficult to explain with text alone

Orbit itself may eventually participate in those visuals.

The learning system is already being structured so lessons can eventually describe when a visual would help, but visual generation and rendering are still future work.

The goal is for visual learning to feel integrated into the experience rather than added on top of it.

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