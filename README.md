# Orbit

**An adaptive AI learning companion that doesn't just learn what you know — it learns how to teach you.**

> 🚧 **Work in progress** — Orbit is actively being developed for the 2026 Meta AI Developer Hackathon.

Orbit is a personalized learning experience designed to help students understand difficult material, figure out where they are struggling, and decide what they should learn next.

Instead of acting like a traditional chatbot or simply generating flashcards from uploaded material, Orbit follows an adaptive learning loop:

**Learn → Quiz → Evaluate → Adapt → Continue**

The goal is to make studying feel less like managing a school dashboard and more like having a learning companion that understands where you left off, what is confusing you, and how to explain it differently when something is not clicking.

---

## The Idea

Most learning tools know **what content** a student is studying.

Orbit is being built to understand more:

- What does this learner already understand?
- Which concepts are still weak?
- What should they work on next?
- Which explanation styles seem to work best for them?
- When should something be reviewed again?
- How can a confusing concept be broken into a smaller, clearer step?

The long-term idea is simple:

> **Orbit doesn't just learn what you know. It learns how to teach you.**

---

## Why Orbit?

A lecture, textbook, or video has to explain something one way to everyone.

But learners do not all get stuck in the same place.

Someone might understand the overall concept but struggle with syntax. Someone else may need an example before a definition makes sense. Another learner may lose the thread when an explanation gets too long.

Orbit is designed around the idea that learning should be able to change in response.

Rather than simply saying an answer is wrong, Orbit should eventually be able to recognize patterns such as:

> You understand the concept. The syntax is what's tripping you up.

or:

> You seem to understand these faster when I show you an example first.

That adaptive behavior is the core of the project.

---

## Attention-Aware Learning

Orbit is also being designed with learners who struggle with attention, information overload, and task re-entry in mind.

This includes many learners with ADHD, but Orbit intentionally avoids treating ADHD as one universal learning style.

Planned attention-aware interactions include:

- Short, focused lesson chunks
- Clear next actions
- Lightweight understanding checks
- Adaptive explanation styles
- Easy return-to-task summaries
- Optional low-distraction focus tools
- User-controlled pacing
- Minimal guilt or streak-based pressure

One of the planned core interactions is:

### "I lost you"

During a lesson, a learner will be able to tell Orbit that the explanation stopped making sense.

Instead of repeating everything, Orbit should identify the point where understanding broke down and try a different approach.

Other planned explanation controls include:

- **Explain that simpler**
- **Give me an example**
- **Show me visually**
- **Why does this matter?**
- **Quiz me on this**
- **Go back one step**

---

## Current Features

Orbit currently includes:

### Adaptive course recommendations

Orbit evaluates available course information and recommends what the learner should work on next.

The Home experience prioritizes the next useful learning action instead of presenting a traditional analytics dashboard.

### Course management

Learners can add courses and provide information about upcoming work.

### Course material uploads

PDF course materials can be uploaded and analyzed to help Orbit understand the course context.

### AI-generated study questions

Orbit can generate questions based on the learner's course and current learning needs.

### Adaptive follow-up learning

Study answers can trigger adapted explanations and follow-up questions instead of ending at a simple correct/incorrect result.

### Topic-level mastery

Mastery is tracked at the individual topic level.

Answering questions updates the relevant topic rather than blindly changing the entire course score.

Overall course mastery is then calculated from the learner's topic mastery.

### Intelligent topic selection

When generating study material, Orbit can consider weaker topics and upcoming work when deciding what the learner should practice.

---

## Current Home Experience

The current Home screen is intentionally designed to answer one question:

> **What should I work on next?**

Rather than using a dashboard full of statistics, Orbit prioritizes:

1. The next recommended learning action
2. The course and topic involved
3. Why the recommendation matters
4. A clear way to continue
5. Progress and mastery as supporting information

The interface is responsive and designed for both desktop and smaller screens.

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

The current visual direction is a strange floating planetary creature made from:

- a translucent glowing inner core
- separated rocky crust fragments
- pieces that appear to orbit around the center

The goal is for Orbit to feel less like a generic AI robot and more like a strange creature that gradually becomes familiar through its personality.

The current Home version uses a static mascot asset with subtle low-gravity motion.

Future character behavior may include:

- floating and drifting
- thinking / tilting
- reacting to answers
- listening
- celebrating
- becoming shy
- pulling its rocky crust inward like a protective shell
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
- Custom mascot artwork
- Subtle ambient movement
- Minimal dashboard-style UI

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

### Motion around the product

Most motion should come from Orbit and the surrounding environment rather than constantly moving buttons and cards.

### No guilt mechanics

Orbit should make it easy to return after losing focus or taking a break.

### Companion, not mascot decoration

Orbit should eventually react to and participate in the learning experience rather than simply appearing as artwork beside it.

### Adapt instead of assume

The system should learn which approaches work for an individual rather than assuming every learner needs the same teaching style.

---

## Tech Stack

Orbit is currently built with:

- **React 19**
- **JavaScript**
- **Vite**
- **CSS**
- **ESLint**
- **Meta Muse / AI-powered course and study logic**

Custom visual assets are being created separately and integrated into the React interface.

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
│   ├── HomeScreen.jsx
│   ├── HomeScreen.css
│   ├── StudySession.jsx
│   ├── CourseDetails.jsx
│   ├── AddCourse.jsx
│   └── AddCourseFile.jsx
│
├── services/
├── App.jsx
└── main.jsx

public/
├── favicon-16.png
├── favicon-32.png
├── icon-180.png
├── icon-192.png
└── icon-512.png
```

The project structure will continue evolving as additional screens and adaptive-learning systems are added.

---

## Running Orbit Locally

### Requirements

- Node.js
- npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Vite will provide a local development URL.

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Run ESLint

```bash
npm run lint
```

---

## Current Development Status

Orbit is under active development.

The current focus is building the core product experience before expanding the feature set.

### Completed / in progress

- [x] React/Vite project foundation
- [x] Course data structure
- [x] Course creation
- [x] PDF course-material input
- [x] AI course recommendations
- [x] AI-generated study questions
- [x] Adaptive follow-up questions
- [x] Course mastery
- [x] Topic-level mastery
- [x] Topic-aware question generation
- [x] Responsive Home experience
- [x] Orbit visual identity
- [x] Orbit mascot direction
- [x] Atmospheric Home environment
- [ ] Redesigned Study Mode
- [ ] "I lost you" interaction
- [ ] Alternate explanation controls
- [ ] Learning-style adaptation
- [ ] Return-to-task recovery
- [ ] Course learning paths
- [ ] Library experience
- [ ] Optional Focus Toy
- [ ] Persistent learner/course state
- [ ] Expanded Orbit character states and animation
- [ ] Final hackathon demo experience

---

## Planned Study Experience

Study Mode is intended to become the core Orbit experience.

Rather than presenting long AI-generated explanations, lessons will be broken into smaller steps.

A future session may work like:

```text
Learn
  ↓
Quick understanding check
  ↓
Evaluate the response
  ↓
Identify what caused the mistake
  ↓
Adapt the explanation
  ↓
Practice again
  ↓
Continue
```

Orbit should become increasingly aware of both:

**what the learner knows**

and

**how the learner learns.**

---

## Future Learning Paths

Structured courses will eventually have topic-level learning paths.

For example:

```text
React Fundamentals

JSX
 │
Components
 │
Props        ← current
 │
State
 │
Effects
```

Orbit may insert review steps or change the recommended path based on learner performance.

Not every subject needs a finite mastery percentage.

Orbit is also intended to support open-ended learning for someone who simply wants to explore a topic such as quantum physics, astronomy, programming, history, or another subject without being enrolled in a formal class.

---

## Long-Term Vision

Orbit should eventually allow someone to start with almost anything:

- a class
- a syllabus
- lecture notes
- a PDF
- a photo of a classroom board
- pasted text
- or simply a subject they want to understand

and turn it into a personalized learning journey.

The system should continuously ask:

> What does this learner understand?

> What are they missing?

> Why are they missing it?

> How should this be explained differently?

> What should happen next?

That is the experience Orbit is being built toward.

---

## Hackathon

Orbit is being developed as an entry for the **2026 Meta AI Developer Hackathon**.

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

Built as an exploration of adaptive AI, personalized education, and learning experiences that respond to the individual instead of forcing every learner through the same path.