# Orbit UI Direction

This file defines the long-term visual, interaction, motion, and learning-experience direction for Orbit.

It is not a task list and does not mean every idea below should be implemented immediately.

Individual implementation tasks should still be scoped separately.

The purpose of this document is to prevent Orbit from gradually drifting into a generic dashboard, generic AI application, or inconsistent collection of features as the product grows.

---

# Graphic Design Is Part of the Product

Orbit should not be designed entirely through UI code.

Custom visual design is a core part of the product identity, not optional polish added after development.

The interface should intentionally combine:

- coded UI,
- custom imagery,
- environmental artwork,
- illustration,
- texture,
- atmospheric effects,
- the Orbit character,
- and motion.

Do not attempt to reproduce every visual element using CSS simply because it is technically possible.

When a custom image, illustration, texture, or designed asset would produce a stronger result, prefer using a real visual asset.

This is especially important for:

- major screen backgrounds,
- environmental scenes,
- Orbit character artwork,
- atmospheric foreground/background elements,
- unusual textures,
- visual storytelling elements.

## Avoid the "AI-Coded Website" Look

A polished Orbit screen should not consist only of:

- CSS gradients,
- glowing blobs,
- rounded rectangles,
- icon libraries,
- text,
- borders,
- shadows,
- and generated UI components.

Those elements may support the interface, but they should not make up the entire visual identity.

Major screens should contain art direction beyond component styling.

## Art and Code Should Be Designed Together

Do not build an entire screen and assume artwork will simply be placed behind it later.

The composition should account for artwork from the beginning.

Consider:

- where Orbit can move,
- where environmental details appear,
- where visual depth exists,
- where text requires negative space,
- how foreground and background layers interact,
- how the scene changes responsively.

UI and artwork should feel like one composition rather than a website placed on top of a wallpaper.

## Environmental Motion

Ambient motion is encouraged when it strengthens the environment.

Potential techniques include:

- layered parallax,
- drifting dust or particles,
- very slow environmental movement,
- moving light or haze,
- floating objects,
- subtle depth shifts,
- animated foreground elements.

Environmental motion should remain slow enough that it does not compete with learning.

## Static Assets vs Motion

Not every asset needs animation.

Use a combination of:

- static background artwork,
- separately layered foreground assets,
- lightweight coded animation,
- animated Orbit states.

Separating visual layers can create motion and depth without requiring every background to be a video.

## Asset Consistency

Generated or sourced artwork should belong to the same visual world.

Avoid using unrelated images simply because they look individually impressive.

Maintain consistency in:

- lighting,
- palette,
- texture,
- level of detail,
- perspective,
- mood,
- character style.

Orbit should eventually have a recognizable visual language across screens.

## Design Check

Before considering a major screen visually complete, ask:

**If all of the cards, text, and buttons disappeared, would there still be evidence that someone art-directed this environment?**

If the answer is no, the screen may rely too heavily on coded UI.

# 1. Product Identity

Orbit is an adaptive AI learning companion.

The central idea is:

**Orbit doesn't just learn what you know. It learns how to teach you.**

Orbit should understand:

- what the learner currently understands,
- what they are struggling with,
- what explanation styles tend to work for them,
- how much information they handle well at once,
- what types of practice improve their retention,
- and what they should probably learn next.

The product should feel less like school-management software and more like entering a personal learning environment that understands where the learner left off.

---

# 2. Core Experience

The fundamental Orbit learning loop is:

**Learn → Quiz → Evaluate → Adapt → Continue**

Orbit should not simply generate content and then score it.

Every part of the experience should reinforce the sense that the system is paying attention and adapting.

Examples:

Instead of:

> Quiz complete. Score: 4/5.

Prefer something like:

> You understand the concept. The syntax is what's tripping you up.

Instead of:

> Recommended topic: Array Methods.

Prefer:

> You missed `filter()` twice. Let's fix that before moving on.

The intelligence should be visible through behavior and language rather than through generic "AI-powered" branding.

---

# 3. Overall Product Feeling

Orbit should feel:

- calm,
- intelligent,
- atmospheric,
- slightly strange,
- premium,
- focused,
- personal,
- alive,
- approachable without feeling childish.

It should NOT feel like:

- a school LMS,
- a SaaS admin panel,
- an analytics dashboard,
- a generic chatbot,
- a crypto website,
- a neon gaming launcher,
- a productivity dashboard with education labels,
- a children's learning app,
- a generic AI startup.

The learner should feel like they have entered a place designed for learning.

---

# 4. Primary Design Principle

**Orbit is a place to learn, not a place to manage learning.**

When the user opens Orbit, the interface should prioritize:

1. What should I do next?
2. What was I learning?
3. What does Orbit think I need?
4. How can I continue?

Progress information should support those questions rather than dominate the experience.

---

# 5. Information Hierarchy

Orbit should generally prioritize information in this order:

### 1. Next action

What should the learner do now?

Examples:

- Continue learning
- Review this topic
- Try a short check
- Resume where you left off

### 2. Current learning context

What course, topic, concept, or skill is currently being worked on?

### 3. Orbit's adaptive insight

What has Orbit noticed?

Examples:

- a concept that is still weak,
- an explanation style that works well,
- something that should be revisited,
- something the learner is ready to move past.

### 4. Progress and mastery

Useful, but secondary.

### 5. Analytics or historical information

Only prominent when the learner explicitly wants it.

A page should not become analytics-heavy simply because the data exists.

---

# 6. Home Screen Philosophy

The Home screen should have one dominant purpose:

**Help the learner continue.**

It should not feel like a dashboard containing every feature.

The main area should communicate:

- where the learner left off,
- what Orbit recommends next,
- and one obvious action.

The hero may contain short conversational copy such as:

> You were getting the hang of React Components.

> Want to see if it stuck?

The exact copy may vary, but the hierarchy should remain simple.

Courses should appear below this primary experience rather than competing with it.

---

# 7. Navigation

Navigation should remain restrained.

Avoid traditional dashboard navigation such as:

- Dashboard
- Analytics
- Progress
- Quizzes
- Assignments
- Reports
- Settings
- etc.

Do not add navigation items simply because features exist.

Prefer a small number of meaningful destinations.

Potential examples:

- Learn
- Library

Profile and settings can live separately.

Orbit should feel simple from the outside even if the underlying system becomes sophisticated.

---

# 8. Avoid the Dashboard Look

This is one of the strongest project guardrails.

Avoid:

- left-hand admin sidebars,
- rows of statistics,
- grids of identical KPI cards,
- excessive widgets,
- large analytics panels,
- fake charts used as decoration,
- progress data competing with learning content,
- every feature receiving its own rectangular panel.

A useful test:

**If the page could easily be mistaken for project-management software after changing the labels, the composition is probably wrong.**

---

# 9. Surfaces and Containers

Not everything needs to live inside a card.

Large portions of Orbit should use:

- open composition,
- whitespace,
- typography,
- background depth,
- positioning,
- hierarchy.

Use containers only when they provide real structure.

Avoid:

- endless rounded rectangles,
- cards inside cards,
- nested panels,
- decorative surfaces with no functional reason.

When surfaces are used, they should generally have:

- restrained borders,
- subtle contrast,
- consistent radius,
- minimal shadow,
- generous internal spacing.

---

# 10. Visual Direction

The main visual foundation should lean toward:

- midnight blue,
- blue-charcoal,
- very dark navy,
- restrained violet,
- restrained periwinkle,
- cool neutral text.

The product should not be completely monochrome, but accent color should be controlled.

Accent color should primarily signal:

- current learning position,
- important action,
- progress,
- active states,
- elements associated with Orbit.

Avoid flooding the interface with accent colors.

---

# 11. Backgrounds

Background design is an important part of Orbit's identity.

Orbit should not simply be flat UI on a solid dark rectangle.

The visual world may include:

- atmospheric environmental imagery,
- abstract extraterrestrial environments,
- orbital geometry,
- soft haze,
- large blurred forms,
- distant structures,
- grain,
- dust,
- restrained particles,
- subtle lighting,
- layered depth.

Custom-generated imagery may be used when it produces a more coherent visual identity than stock imagery.

Backgrounds should feel like worldbuilding rather than decoration.

Avoid:

- generic starfield wallpapers,
- obvious stock-space photography,
- extremely detailed sci-fi scenes competing with text,
- random imagery unrelated to the product,
- loud galaxy textures,
- giant gradient blobs as the entire visual identity.

Text and interactions must always remain readable.

---

# 12. Background Layering

A useful structure for major screens is:

### Layer 1 — base atmosphere

A dark, stable color foundation.

### Layer 2 — environmental imagery

Subtle scenery, shapes, structures, orbital forms, or visual depth.

### Layer 3 — ambient motion

Very restrained movement such as:

- dust,
- particles,
- slow parallax,
- environmental drift,
- soft light movement.

### Layer 4 — functional interface

The UI itself remains clean and stable.

---

# 13. Orbit Companion

Orbit is intended to have an animated alien companion.

The companion is not simply a logo or static mascot.

Orbit should feel like another living presence in the learning environment.

The character should be:

- alien,
- unusual,
- recognizable,
- slightly ugly or strange at first,
- lovable through personality,
- expressive through movement,
- visually simple enough to animate consistently.

Avoid:

- generic green aliens,
- sleek AI robots,
- glowing AI spheres,
- astronauts,
- obvious Pixar-style mascots,
- characters that strongly resemble existing IP,
- overly cute children's mascots.

The intended emotional effect is closer to:

**"What is that weird thing?"**

followed eventually by:

**"I love that thing."**

---

# 14. Orbit Character Behavior

Orbit should have behavioral states.

Possible states include:

### Idle

Orbit quietly exists in the environment.

It might:

- float,
- crawl,
- reposition itself,
- fidget,
- look around,
- inspect something nearby.

### Thinking

Orbit should visibly react when processing.

Possible behaviors:

- pause,
- tilt,
- manipulate an object,
- inspect something,
- use a small device,
- type or work,
- focus on a floating element.

### Teaching

Orbit may:

- move closer to the content,
- point toward something,
- react to examples,
- guide attention subtly.

### Celebrating

Small, charming reactions are preferred over large confetti-style rewards.

### Confusion / correction

Orbit should appear attentive or curious rather than disappointed.

The character should never shame the learner.

### Waiting

Orbit can quietly occupy itself instead of demanding attention.

If the learner returns after being inactive, Orbit may notice them naturally rather than aggressively calling them back.

---

# 15. Motion Philosophy

Orbit should contain meaningful motion.

The goal is not a completely static application.

However:

**Motion around the product is preferred over motion inside every widget.**

Good motion includes:

- Orbit moving through the environment,
- floating,
- crawling,
- fidgeting,
- environmental particles,
- subtle parallax,
- soft atmospheric movement,
- restrained progress transitions,
- small active-topic animation.

Avoid:

- bouncing cards,
- constant button animation,
- spinning icons,
- aggressive glow pulses,
- excessive hover transformations,
- animated UI competing for attention,
- movement purely because animation is available.

The core learning interface should remain stable.

---

# 16. Study Mode

Study Mode should become quieter than the Home experience.

When a learner begins studying, unrelated interface elements should recede.

The screen should focus primarily on:

- the concept,
- explanation,
- interaction,
- progress through the current session,
- Orbit.

Avoid carrying the full navigation/dashboard environment into focused study.

Study Mode should feel like entering a more concentrated space.

---

# 17. Lesson Chunking

Orbit should avoid dumping large walls of generated text onto the learner.

Prefer small conceptual units.

For example:

Instead of six paragraphs explaining React props at once:

1. Introduce one concept.
2. Give a short explanation.
3. Offer an example.
4. Check understanding.
5. Continue when appropriate.

The learner should feel steady progress without being overwhelmed.

---

# 18. "I Lost You"

A key future interaction is:

**I lost you**

This should allow the learner to tell Orbit that the explanation stopped making sense.

Orbit should not simply repeat the entire explanation.

Instead, it should attempt to determine where understanding broke down and recover from that point.

Example:

Orbit:

> A component receives information from its parent through props...

Learner:

> I lost you.

Orbit might respond:

> Forget the code for a second. Think of the parent component handing the child a note. That note is the information being passed.

The purpose is to repair understanding without forcing the learner to restart.

This interaction is an important part of Orbit's identity.

---

# 19. Explanation Controls

During a lesson, the learner should eventually be able to ask for alternate teaching approaches without needing to formulate a full prompt.

Potential actions:

- I lost you
- Explain that simpler
- Give me an example
- Show me visually
- Why does this matter?
- Quiz me on this
- Go back one step

These controls should remain visually unobtrusive until needed.

The goal is not to cover the screen with options.

---

# 20. Learning Style Adaptation

Orbit should gradually learn how the individual responds to different teaching styles.

Possible patterns:

- examples before definitions,
- visual explanations,
- very short chunks,
- practice-first learning,
- analogy-heavy explanations,
- additional repetition,
- immediate quizzes,
- slower pacing.

Orbit should not permanently infer a preference from one interaction.

When appropriate, it can ask.

Example:

> You seem to get these faster when I show an example first. Want me to keep doing that?

The learner should remain in control.

---

# 21. ADHD and Attention-Aware Design

Orbit should be especially useful for learners who struggle with:

- long lectures,
- attention drift,
- working memory,
- task re-entry,
- unclear explanations,
- information overload.

However, Orbit should NOT have a stereotypical universal "ADHD mode."

Different learners with ADHD may benefit from very different approaches.

The system should adapt instead.

Design for:

- short chunks,
- clear next actions,
- low visual clutter,
- easy re-entry,
- optional stimulation,
- alternate explanations,
- frequent lightweight understanding checks,
- user-controlled pacing.

These features should improve Orbit for many learners, not only learners with ADHD.

---

# 22. Focus Toy

Orbit may eventually include an optional low-demand interactive focus object.

The purpose is sensory stimulation, not entertainment.

Possible concepts:

- squishable alien blob,
- draggable particles,
- orbital object,
- rotating object,
- floating rock,
- simple repetitive click interaction,
- soft physics interaction.

The Focus Toy should NOT have:

- scores,
- streaks,
- goals,
- leaderboards,
- rewards,
- timers,
- escalating mechanics,
- notifications.

It should not become another game competing with the lesson.

The learner should be able to disable it entirely.

---

# 23. Return-to-Task Recovery

Orbit should be excellent at helping learners recover after losing focus or leaving a session.

Rather than forcing them to reconstruct context, Orbit can provide a short re-entry summary.

Example:

> We were learning why React uses props.

> You already understood:
> - components can be reused,
> - parents can pass information.

> We were working on:
> **how the child receives that information.**

Then:

**Continue from there**

This should feel supportive rather than corrective.

---

# 24. No Guilt Mechanics

Orbit should not punish inconsistent study behavior.

Avoid:

- shame-based streak messaging,
- angry warnings,
- "you failed to study today,"
- punishment for leaving a session,
- negative mascot reactions,
- excessive red failure states.

If someone disappears for a week, Orbit should simply help them resume.

Example:

> React's still here. Want to do five minutes?

The product should reduce the emotional friction of restarting.

---

# 25. Mastery

Mastery is an important part of Orbit but should not make the product feel analytical.

A course can have:

- overall mastery,
- topic-level mastery,
- current learning position.

Mastery should be visually quiet.

It can appear through:

- small percentages,
- subtle progress lines,
- path completion,
- orbital progress,
- restrained indicators.

Avoid making giant mastery numbers the hero of the screen.

The learning action is more important than the metric.

---

# 26. Course Experience

Courses should feel like worlds or learning journeys rather than rows in a database.

A course should communicate:

- where the learner currently is,
- what they already know,
- what comes next,
- where Orbit wants them to review something.

A structured course may have mastery.

An open-ended exploration topic may not.

The interface should eventually support both without forcing every learning experience into the exact same progress model.

---

# 27. Learning Path

The Course screen should eventually emphasize a learning path.

Topics may appear as connected points along a vertical or gently curved route.

Example:

JSX  
↓  
Components  
↓  
Props ← current  
↓  
State  
↓  
Effects

Completed topics can appear subtly resolved.

The current topic should be immediately recognizable.

Orbit may appear near specific nodes when it has an adaptive recommendation.

Example:

> Props tripped you up twice. I put a short review here.

The path should feel like progression rather than a checklist.

---

# 28. Typography

Typography should do a large amount of the visual work.

Prefer:

- strong hierarchy,
- large readable learning text,
- restrained supporting text,
- short copy,
- clear spacing.

Avoid:

- giant marketing headlines,
- excessive bold text,
- tiny analytics labels,
- decorative type everywhere.

Important conversational language may be more visually prominent than statistics.

For example:

**Want to see if it stuck?**

should generally feel more important than:

**68% mastery**

---

# 29. Buttons

Keep the action system consistent.

A useful hierarchy:

### Primary action

Examples:

- Continue learning
- Start review
- Check my understanding

### Secondary action

Examples:

- Review topic
- Try another explanation

### Text action

Examples:

- View course
- See learning path

Avoid creating many different button styles across the application.

---

# 30. Icons

Icons should support comprehension.

They should not exist simply to make empty areas look designed.

Avoid decorating every label or card with icons.

Consistent iconography is preferred when icons are actually useful.

---

# 31. Rewards and Celebration

Orbit may acknowledge progress, but rewards should remain subtle.

Prefer:

- Orbit reacting,
- slight environmental response,
- small motion,
- encouraging language,
- visible mastery improvement.

Avoid:

- overwhelming confetti,
- casino-like reward loops,
- constant badges,
- excessive streak pressure,
- artificial gamification everywhere.

The reward should primarily be:

**I understand this now.**

---

# 32. Responsive Design

Desktop is important.

Orbit should not look like a mobile app stretched across a desktop browser.

Desktop layouts should use space intentionally.

At the same time, smaller screens should preserve:

- hierarchy,
- readability,
- primary action,
- learning context.

Environmental imagery and mascot placement should adapt without crowding the functional interface.

---

# 33. Accessibility and Focus

Visual atmosphere should never come at the cost of usability.

Important principles:

- maintain strong text contrast,
- avoid unnecessary flashing,
- respect reduced-motion preferences,
- keep important controls predictable,
- avoid attention-demanding animation during focused learning,
- keep interactive targets clear.

The product should be stimulating when useful and quiet when concentration matters.

---

# 34. Implementation Quality

The visual system should become reusable without becoming over-engineered.

Prefer:

- reusable components where real patterns exist,
- shared spacing and color tokens,
- predictable styling,
- consistent interaction patterns.

Avoid:

- one massive page component,
- one-off styling for every element,
- premature abstraction,
- introducing large UI frameworks purely for convenience,
- rebuilding unrelated functionality during visual tasks.

Preserve existing behavior unless a task explicitly requires changing it.

---

# 35. What Makes Orbit Feel "Vibe-Coded"

Avoid combinations such as:

- large gradient heading,
- glowing purple button,
- three statistic cards,
- glassmorphism,
- Lucide icons everywhere,
- huge border radius,
- generic AI orb,
- random animated blobs,
- excessive copy,
- inconsistent styling.

None of those techniques are automatically wrong.

The issue is using them automatically rather than because Orbit needs them.

Every major visual choice should serve the product's identity.

---

# 36. Design Test

Before accepting a new screen, ask:

### Does the learner immediately know what to do?

If not, simplify.

### Does this feel like a dashboard?

If yes, reconsider the composition.

### Is progress information louder than learning?

If yes, reduce it.

### Are we putting something in a card simply because cards are easy?

If yes, remove the card and test the composition without it.

### Is the motion helping atmosphere, feedback, or personality?

If not, remove it.

### Is Orbit behaving like a companion or merely appearing as a mascot?

Prefer companion behavior.

### Is the learner being punished for distraction or inconsistency?

If yes, redesign the interaction.

### Could this interface belong to any random AI startup after replacing the logo?

If yes, it needs more Orbit identity.

---

# 37. Long-Term North Star

Orbit should eventually feel like a learning environment that quietly understands the learner.

A student should be able to enter Orbit with:

- a class,
- lecture notes,
- a photo of a board,
- pasted material,
- a subject they simply want to learn,

and Orbit should help transform that material into an adaptive learning journey.

The system should continuously answer:

- What does this learner understand?
- What are they missing?
- Why are they missing it?
- How should this be explained differently?
- What should happen next?

The interface should make that intelligence feel natural rather than technical.

---

# Final Principle

When there is tension between showing more information and helping the learner focus:

**Choose focus.**

When there is tension between showing analytics and helping the learner continue:

**Choose continuation.**

When there is tension between generic polish and Orbit's personality:

**Choose Orbit.**