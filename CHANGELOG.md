# Changelog

## Unreleased

### Improvements

- Home now places its learning recommendation and companion in a nebula environment, with dark text areas, soft edges, and a quieter crop on smaller screens.
- Orbit now uses its own browser and app icons. The Home companion has a more noticeable, calm floating motion while remaining static for reduced-motion users.
- Home now features the Orbit logo and companion artwork, with gentle floating motion that respects reduced-motion preferences and compact placement on smaller screens.
- Home now puts the next learning action first, with a calmer dark palette, a responsive hero, and easy-to-scan courses below. Course details, adding courses, and uploading materials remain available below the recommendation.
- Study question generation now asks Muse to choose a relevant topic, preferring weaker topics when they relate to upcoming work.
- Study answers now update mastery for the question's topic, with overall course mastery calculated as the rounded average of topic scores. Questions without a topic retain the existing course mastery behavior.

### Manual test checklist

- Review the Home background on desktop and narrow screens; check text contrast, mascot visibility, the fade into courses, and the absence of horizontal scrolling.
- Reload Orbit and check its browser icon and saved home-screen icon; watch a full mascot float cycle, then enable reduced motion and confirm it remains static.
- Check the Home logo and mascot on desktop and mobile; enable reduced motion and confirm the mascot stays still while the learning action remains easy to reach.
- Review Home on desktop and narrow screens; check keyboard navigation, course disclosures, adding a course, uploading a PDF, and continuing into a study session.
- Generate study questions with and without topic mastery scores; confirm each response includes a relevant topic and the existing question, answers, and explanation.
- Check correct and incorrect answers for both main and follow-up questions, including topics with different capitalization, new topics, and questions without a topic; verify topic scores and the overall course average.
