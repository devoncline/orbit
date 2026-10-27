# Changelog

## Unreleased

### Improvements

- Home now puts the next learning action first, with a calmer dark palette, a responsive hero, and easy-to-scan courses below. Course details, adding courses, and uploading materials remain available below the recommendation.
- Study question generation now asks Muse to choose a relevant topic, preferring weaker topics when they relate to upcoming work.
- Study answers now update mastery for the question's topic, with overall course mastery calculated as the rounded average of topic scores. Questions without a topic retain the existing course mastery behavior.

### Manual test checklist

- Review Home on desktop and narrow screens; check keyboard navigation, course disclosures, adding a course, uploading a PDF, and continuing into a study session.
- Generate study questions with and without topic mastery scores; confirm each response includes a relevant topic and the existing question, answers, and explanation.
- Check correct and incorrect answers for both main and follow-up questions, including topics with different capitalization, new topics, and questions without a topic; verify topic scores and the overall course average.
