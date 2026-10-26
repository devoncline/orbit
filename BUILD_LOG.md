# Orbit Build Log

This file is a chronological record of what I built during the Meta Global AI Developer Hackathon, why I built it, and what I learned along the way.

---

## October 26, 2026

### Project Setup

**Built**
- Created the public `orbit` GitHub repository.
- Cloned the repository locally using GitHub Desktop.
- Opened the project in VS Code.
- Initialized a React application with Vite.
- Selected JavaScript and ESLint.
- Installed npm dependencies.
- Started the Vite development server at `localhost:5173`.

**Learned**
- React is being used to build Orbit's interface with reusable components.
- Vite creates and runs the development environment.
- npm installs and manages project dependencies.
- `node_modules` contains installed packages and normally should not be edited manually.
- ESLint checks JavaScript and React code for potential problems.
- `localhost` means the application is currently running only on my computer.

**Why it matters**

This created the technical foundation for Orbit before adding any AI functionality.

**Commit**

`Create first Orbit UI`

---

### First Orbit UI

**Built**
- Removed the default Vite starter interface.
- Replaced it with the first Orbit-specific React screen.
- Added the Orbit name, learning loop, and initial product description.
- Added an initial multi-course view with Biology, Algebra, and History.
- Added a recommended course and study-session entry point.

**Learned**
- `main.jsx` starts the React application and renders the `App` component.
- `App.jsx` contains the main React component.
- A React component can be a JavaScript function.
- The function returns JSX describing what should appear in the browser.
- React state allows the interface to change without reloading the page.
- Props allow data and functions to be passed between components.

**Why it matters**

This created the first working version of Orbit's learning workflow instead of a static mockup.

---

### Adaptive Study Session Prototype

**Built**
- Created a separate `StudySession` React component.
- Added an initial Learn → Quiz → Evaluate → Adapt flow.
- Added mastery tracking.
- Added different behavior for correct and incorrect answers.
- Added a simpler follow-up question after an incorrect answer.

**Learned**
- `useState` stores information that can change while the application is running.
- Updating state causes React to re-render the interface.
- Event handlers can update multiple pieces of state based on a student's answer.
- Components can receive state and setter functions through props.

**Why it matters**

This proved the adaptive learning interaction before adding AI. The first version was intentionally hardcoded so I could make sure the product logic worked before introducing model-generated behavior.

---

### Course and Syllabus Context

**Built**
- Added the ability to create courses.
- Added course detail information.
- Added course material uploads.
- Added PDF-only course material support.
- Added syllabus fields including course name, instructor, and semester.
- Added important topics and upcoming work to the course data model.

**Learned**
- Browser file inputs provide a JavaScript `File` object.
- Files can be converted to Base64 using `FileReader`.
- React state can be updated by mapping over an existing array and replacing only the course that changed.
- Course files are useful as evidence for Orbit's decisions rather than simply acting as stored documents.

**Why it matters**

Orbit needs real context about what a student is responsible for before it can make useful learning decisions. Course files are inputs to the learning agent, not the main product.

---

### Secure Meta Muse Connection

**Built**
- Deployed Orbit to Vercel.
- Added Vercel serverless API routes.
- Stored the Meta Model API key securely as a Vercel environment variable.
- Connected the frontend to the backend without exposing the API key in browser code.
- Successfully sent requests from Orbit to Meta Muse Spark 1.3.
- Confirmed the deployed application could receive real Muse responses.

**Learned**
- How to structure a frontend-to-backend AI request securely in a deployed React application.
- How Vercel serverless functions can act as the protected layer between the browser and an external model API.
- How environment variables are accessed from server-side code in production.
- How to verify that the frontend can use an AI service without exposing the underlying secret.

**Why it matters**

This created the secure AI architecture Orbit now uses:

`React frontend → Vercel serverless API → Meta Muse → Orbit`

The browser never receives the Meta API key.

---

### AI Syllabus Analysis

**Built**
- Added an `/api/analyze-course` endpoint.
- Sent uploaded syllabus PDFs to Meta Muse.
- Asked Muse to return structured JSON instead of free-form text.
- Extracted:
  - course name
  - instructor
  - semester
  - important topics
  - upcoming assignments and quizzes
  - a recommended next learning action
- Parsed Muse's response on the backend.
- Updated Orbit's React course state using the extracted information.

**Test**

Uploaded a fake Biology 101 syllabus.

Orbit successfully identified:
- Dr. Maya Carter
- Fall 2026
- Mendelian genetics
- genotype vs. phenotype
- Punnett squares
- dominant and recessive alleles
- a Genetics Quiz on October 28, 2026

Orbit then recommended reviewing the Genetics Prep Worksheet and practicing Punnett-square problems.

**Learned**
- A model response can contain reasoning and message objects in addition to the actual generated text.
- The useful `output_text` can be extracted and parsed with `JSON.parse()`.
- Structured AI output is much easier for application code to use than plain conversational text.

**Why it matters**

Orbit can now turn an actual student document into learning context and use that context to decide what the student should work on next.

---

### AI-Generated Study Questions

**Built**
- Added `/api/generate-study-question`.
- Added a frontend `generateStudyQuestion()` service.
- Used `useEffect` to generate a question when a study session begins.
- Sent the course recommendation, important topics, upcoming work, and current mastery to Muse.
- Replaced the hardcoded study question with a Muse-generated question.
- Replaced hardcoded answers with model-generated answer choices.
- Used `.map()` to turn Muse's answer array into React buttons.
- Used each answer's `correct` value to determine what happens after the student clicks it.

**Test**

After uploading the Biology syllabus, Orbit generated genetics questions based on the extracted course material instead of the original hardcoded photosynthesis question.

One generated question asked about a Punnett-square cross between pea plants and tested the probability of a phenotype.

**Learned**
- `useEffect` can run an asynchronous setup action when a component first appears.
- `.map()` can turn an array of model-generated data into UI elements.
- Optional chaining such as `studyQuestion?.answers?.map()` prevents the app from trying to use data before it has loaded.
- Loading states make asynchronous model calls understandable to the user.

**Why it matters**

The study experience is no longer a scripted quiz. Orbit can generate a learning interaction based on the student's actual course context.

---

### AI Evaluation and Adaptation

**Built**
- Added `/api/evaluate-study-answer`.
- Added an `evaluateStudyAnswer()` frontend service.
- Sent Muse:
  - the original question
  - the student's selected answer
  - the correct answer
  - the relevant course topics
  - the student's current mastery
- Generated personalized feedback after a wrong answer.
- Generated a simpler explanation based on the student's mistake.
- Generated an easier follow-up question testing the same concept.
- Generated new follow-up answer choices.
- Updated mastery based on student performance.
- Replaced the hardcoded correct-answer explanation with Muse's generated explanation.

**Test**

Orbit asked:

A heterozygous tall pea plant `(Tt)` is crossed with a homozygous short plant `(tt)`. What is the probability of a tall phenotype?

After selecting the incorrect `100%` answer, Orbit identified the misconception that a dominant allele does not automatically appear in 100% of offspring.

Orbit then changed its teaching approach and explained the cross as a simple 50/50 allele "coin flip."

Finally, it generated an easier follow-up question asking what phenotype a plant with genotype `tt` would have.

**Learned**
- An `async` click handler can wait for an AI response before updating the next part of the interface.
- AI can be used for more than content generation; it can evaluate a student's response and choose a different teaching strategy.
- The student's wrong answer provides useful evidence about what they may misunderstand.
- An adaptive system should change what happens next instead of simply displaying whether an answer was right or wrong.

**Why it matters**

This is the first fully AI-driven version of Orbit's core learning loop:

**Learn → Quiz → Evaluate → Adapt → Continue**

Orbit is no longer just generating educational content. It is using student performance to decide how the learning experience should change.

---

## Current System

Orbit can currently:

1. Accept a real course syllabus as a PDF.
2. Use Meta Muse to understand the course.
3. Identify important topics and upcoming work.
4. Recommend what the student should work on.
5. Generate a study question from that context.
6. Evaluate the student's answer.
7. Update mastery.
8. Identify a likely conceptual gap after an incorrect answer.
9. Explain the concept differently.
10. Generate an easier follow-up question to test whether the new explanation worked.

The current prototype uses React, Vite, JavaScript, Vercel serverless functions, and Meta Muse Spark 1.3.

---

## Next

- Allow a study session to continue into Question 2, Question 3, and beyond.
- Use updated mastery when deciding the difficulty and focus of the next question.
- Decide what should happen when a student misses the adapted follow-up question.
- Improve the multi-course decision logic so Orbit can choose what the student should study across all courses.
- Replace the prototype interface with the final Orbit visual system and companion.
- Add persistence so course context and learning progress survive page refreshes.
- Prepare the final hackathon demo around Orbit's decision-making and adaptive behavior rather than presenting it as a traditional education dashboard.