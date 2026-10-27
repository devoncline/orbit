# Changelog

## Unreleased

### Improvements

- Learners can now ask questions or share connections during a lesson and receive short, contextual replies from Orbit. The lesson shortcuts and "Quiz me" remain available, with conversation kept only for the current session.
- Study sessions now begin with a short, topic-aware lesson. Learners can ask for a different explanation or a concrete example, then choose "Quiz me" to practice the concept before continuing through adaptive questions.
- Home now places its learning recommendation and companion in a nebula environment, with dark text areas, soft edges, and a quieter crop on smaller screens.
- Orbit now uses its own browser and app icons. The Home companion has a more noticeable, calm floating motion while remaining static for reduced-motion users.
- Home now features the Orbit logo and companion artwork, with gentle floating motion that respects reduced-motion preferences and compact placement on smaller screens.
- Home now puts the next learning action first, with a calmer dark palette, a responsive hero, and easy-to-scan courses below. Course details, adding courses, and uploading materials remain available below the recommendation.
- Study question generation now asks Muse to choose a relevant topic, preferring weaker topics when they relate to upcoming work.
- Study answers now update mastery for the question's topic, with overall course mastery calculated as the rounded average of topic scores. Questions without a topic retain the existing course mastery behavior.

### Manual test checklist

- During Learn, ask a question, share a connection, and send several follow-ups; check that replies stay concise and on topic. Try a failed send and retry, both lesson shortcuts, and "Quiz me" while a reply is pending; confirm the existing quiz, follow-up, and mastery flow still works. Check input usability on mobile and with a keyboard.
- Start a session with and without topic mastery; confirm a short lesson appears before any question. Try "I lost you" and "Give me an example" repeatedly, then "Quiz me"; verify the first question covers the lesson and correct/incorrect answers, follow-ups, and Continue still update the active course's mastery.
- Check the lesson on a narrow screen and with keyboard navigation. Simulate a failed lesson, explanation, example, or question request; confirm retry works, existing lesson content stays visible, and actions are disabled while a request is pending.
- Review the Home background on desktop and narrow screens; check text contrast, mascot visibility, the fade into courses, and the absence of horizontal scrolling.
- Reload Orbit and check its browser icon and saved home-screen icon; watch a full mascot float cycle, then enable reduced motion and confirm it remains static.
- Check the Home logo and mascot on desktop and mobile; enable reduced motion and confirm the mascot stays still while the learning action remains easy to reach.
- Review Home on desktop and narrow screens; check keyboard navigation, course disclosures, adding a course, uploading a PDF, and continuing into a study session.
- Generate study questions with and without topic mastery scores; confirm each response includes a relevant topic and the existing question, answers, and explanation.
- Check correct and incorrect answers for both main and follow-up questions, including topics with different capitalization, new topics, and questions without a topic; verify topic scores and the overall course average.
