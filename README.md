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
| **Evaluate** | Activity feedback identifies what the response shows; quiz answers update the relevant topic's mastery estimate. |
| **Adapt** | Confusion can lead to a different explanation, a useful visual, or an easier follow-up question on the same concept. |
| **Continue** | Move to the next small lesson using a revisable path, or return later with recent context intact. |

The learner controls the pace. Continuing does not require a quiz, and reading a lesson or clicking “I understand” does not count as proof of mastery. Practice feedback and quiz results have different roles: activities inform teaching, while quiz answers update topic scores.

For example, a learner studying photosynthesis can read a short explanation, say **“I lost you,”** request a visual of the inputs and outputs, and then check their understanding. If they answer incorrectly, Orbit offers an adapted explanation and a simpler follow-up before they decide whether to continue.

## What Makes Orbit Different

- **“I lost you” is part of the lesson.** Ask for a new analogy, a familiar example, or smaller steps while staying with the same concept. The current learning flow remains available.
- **Teaching preferences are editable.** Choose explanation length, example timing, visual support, next-step guidance, and return support. Setup is optional, and a current request takes priority over a saved preference.
- **Course material shapes the starting point.** Add PDF syllabi or course documents to a learning space. Extracted topics, schedules, and upcoming work help suggest relevant lessons; learners can correct where their class actually is.
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
| **Adapted teaching** | Re-explain the current concept after “I lost you” or produce a concrete worked example. |
| **Activities and evaluation** | Create small applied tasks and respond to the learner's attempt with focused feedback. Generate topic-aware quiz questions, plus corrective explanations and easier follow-ups after incorrect answers. |
| **Study conversation** | Answer questions in the context of the current lesson and recent exchanges, drawing on relevant saved learning connections. |
| **PDF analysis** | Extract course information, topics, syllabus timing, assignments, and an initial recommended action from uploaded material. |
| **Instructional visuals** | Spark can propose a visual when it helps explain a concept; Muse Image generates it. Learners can also request a visual through “Show me.” |

Orbit supplies relevant context and applies its own rules around those responses. Learner corrections take priority over inferred course position. Quiz scoring and mastery updates are handled by application logic; Muse supplies the questions and adapted teaching. Home and course starting suggestions use saved context and local course-position rules, so opening a page or resuming a saved lesson does not trigger a fresh model request.

The request path is **React frontend → Vercel serverless API → Meta Muse → Orbit**. Review the handlers in [`api/`](api/) and the named client calls in [`src/services/meta.js`](src/services/meta.js) and [`src/services/lessonImages.js`](src/services/lessonImages.js).

## Privacy & Learner Memory

The current demo requires **no learner account** and uses bounded browser-local storage rather than an application database or cross-device sync.

- **Saved here:** learning spaces, extracted course context, topic mastery, preferences, learner corrections, recent lessons, compact conversation history, and useful learning connections. Recent generated-image references are also saved so available visuals can be reused.
- **Sent for AI processing:** uploaded PDFs and the relevant learning context needed for the requested teaching action are sent through Orbit's server to Meta. Local storage does not mean that AI features run offline.
- **Material retention:** Orbit keeps processed filenames, metadata, and extracted context. It does not retain original PDF bytes for reopening or downloading. Full conversation transcripts, unfinished activity/quiz screens, and response drafts are not restored after a refresh.
- **User control:** Library includes a control to clear local learning data. Teaching preferences can be edited or reset separately. Anyone using the same browser profile can access its saved learning data; clearing browser data removes it.

API credentials remain server-side. The browser calls Orbit's API routes and never receives `MODEL_API_KEY`.

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

### 3. Start the full app

```bash
npm run dev:api
```

Open the URL printed by Vercel. This runs the frontend and the root `/api/*` functions together. Start from **Learn** with a topic, or create a class space and add a PDF to try course-aware learning.

| Command | Purpose |
| --- | --- |
| `npm run dev:api` | Full local app, including serverless AI routes |
| `npm run dev` | Vite frontend only; does not execute `/api/*` |
| `npm run build` | Production frontend build |
| `npm run preview` | Preview that frontend build; no serverless API runtime |
| `npm run lint` | ESLint checks |
| `npm test` | Automated tests |

Use `dev:api` for lessons, uploads, conversation, and image generation. If the interface opens but AI actions fail under plain Vite, switch to the full runtime and check the server-side key.

## Project Documentation

- [BUILD_LOG.md](BUILD_LOG.md) — development milestones, decisions, and lessons from building Orbit.
- [CHANGELOG.md](CHANGELOG.md) — current changes and detailed manual verification checklists.
- [UI_DIRECTION.md](UI_DIRECTION.md) — the product's visual, interaction, and attention-aware design direction, including longer-term ideas.
- [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) — hackathon demo preparation, verification evidence, and remaining checks.

Orbit is an actively developed hackathon project. Its current adaptation uses explicit preferences, recent context, and practice evidence; deeper long-term personalization remains part of the direction.

Built by **Devon Cline** as an exploration of learning experiences that respond to the individual.
