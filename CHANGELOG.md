# Changelog

## Unreleased

### Improvements

- Home now leads with the current learning task or question and a contextual action. Study gives Orbit a larger visual stage, with a dedicated mobile composition, calmer motion, and clearer controls. Calendar, Library, and space setup use simpler copy and more open layouts with fewer dividers.
- Orbit now has learning spaces for classes, skills, and personal interests, with a calm shared navigation, a mobile menu, and three ways to begin from an empty account. Home keeps one next action in focus and uses Orbit’s existing environment and companion artwork.
- A lightweight Calendar and Home preview gather dated work from learning materials, keeping unclear dates separate for review. Materials can be added directly to a chosen space, with visible upload progress and retry feedback.
- Study now has a quieter environment, clear Learn/Practice progress, and a way to return Home and resume the current session. Spaces and progress still last only until refresh.
- Orbit can now remember useful connections, successful activities, and tentative misconceptions during a study session, then reuse relevant examples in later teaching and practice. These memories stay within the current session and do not change mastery.
- Learn now offers "Let me try it": a short, practical activity based on the current concept and conversation. Learners can share what they tried, get focused feedback, and keep talking or choose "Quiz me". Activities stay in the current session and do not change mastery.
- Learners can now ask questions or share connections during a lesson and receive short, contextual replies from Orbit. The lesson shortcuts and "Quiz me" remain available, with conversation kept only for the current session.
- Study sessions now begin with a short, topic-aware lesson. Learners can ask for a different explanation or a concrete example, then choose "Quiz me" to practice the concept before continuing through adaptive questions.
- Home now places its learning recommendation and companion in a nebula environment, with dark text areas, soft edges, and a quieter crop on smaller screens.
- Orbit now uses its own browser and app icons. The Home companion has a more noticeable, calm floating motion while remaining static for reduced-motion users.
- Home now features the Orbit logo and companion artwork, with gentle floating motion that respects reduced-motion preferences and compact placement on smaller screens.
- Home now puts the next learning action first, with a calmer dark palette, a responsive hero, and easy-to-scan courses below. Course details, adding courses, and uploading materials remain available below the recommendation.
- Study question generation now asks Muse to choose a relevant topic, preferring weaker topics when they relate to upcoming work.
- Study answers now update mastery for the question's topic, with overall course mastery calculated as the rounded average of topic scores. Questions without a topic retain the existing course mastery behavior.

### Manual test checklist

- Review Home, Study, Calendar, Library, and space setup on desktop and mobile. Try a question as a starting point, resume a lesson after navigating away, and check keyboard focus, the menu, and reduced motion. Confirm lesson controls, conversation, applied activities, quizzes, and retries remain usable on a phone.
- Start with no spaces and try the class, curiosity, and material entry points. Add one space, then several (including a long name); verify Home stays compact and the full list remains accessible in navigation and Library. Check the mobile menu, Escape, keyboard focus, and reduced motion.
- Add a PDF to a chosen space and check its material list and any extracted dates in Calendar. Check a failed upload and retry, ambiguous dates, and a Home preview with more than three upcoming items. Leave Study for Home or Calendar and resume; verify the current lesson, conversation, activity, quiz, and mastery remain intact.
- Explain a useful analogy or complete an activity, continue past several conversation turns, then request another explanation, example, activity, or quiz. Check that Orbit can refer naturally to relevant earlier work without repeating it every time or bringing in unrelated topics. Try an incorrect quiz answer and its adapted follow-up; verify mastery and Continue still work. Start a fresh session or refresh to check that session memories are cleared and no memory panel or internal labels appear.
- During Learn, try "Let me try it", submit a response, revise it, and ask about the result in conversation. Check that feedback stays concise, mastery stays unchanged, and a new activity replaces the previous one. Try failed generation and feedback requests, retry without losing your response, and choose "Quiz me" before an activity, after feedback, and while an activity request is pending. Check the response input on mobile and with a keyboard.
- During Learn, ask a question, share a connection, and send several follow-ups; check that replies stay concise and on topic. Try a failed send and retry, both lesson shortcuts, and "Quiz me" while a reply is pending; confirm the existing quiz, follow-up, and mastery flow still works. Check input usability on mobile and with a keyboard.
- Start a session with and without topic mastery; confirm a short lesson appears before any question. Try "I lost you" and "Give me an example" repeatedly, then "Quiz me"; verify the first question covers the lesson and correct/incorrect answers, follow-ups, and Continue still update the active course's mastery.
- Check the lesson on a narrow screen and with keyboard navigation. Simulate a failed lesson, explanation, example, or question request; confirm retry works, existing lesson content stays visible, and actions are disabled while a request is pending.
- Review the Home background on desktop and narrow screens; check text contrast, mascot visibility, the fade into courses, and the absence of horizontal scrolling.
- Reload Orbit and check its browser icon and saved home-screen icon; watch a full mascot float cycle, then enable reduced motion and confirm it remains static.
- Check the Home logo and mascot on desktop and mobile; enable reduced motion and confirm the mascot stays still while the learning action remains easy to reach.
- Review Home on desktop and narrow screens; check keyboard navigation, course disclosures, adding a course, uploading a PDF, and continuing into a study session.
- Generate study questions with and without topic mastery scores; confirm each response includes a relevant topic and the existing question, answers, and explanation.
- Check correct and incorrect answers for both main and follow-up questions, including topics with different capitalization, new topics, and questions without a topic; verify topic scores and the overall course average.
