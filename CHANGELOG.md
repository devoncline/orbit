# Changelog

## Unreleased

### Improvements

- Study question generation now asks Muse to choose a relevant topic, preferring weaker topics when they relate to upcoming work.
- Study answers now update mastery for the question's topic, with overall course mastery calculated as the rounded average of topic scores. Questions without a topic retain the existing course mastery behavior.

### Manual test checklist

- Generate study questions with and without topic mastery scores; confirm each response includes a relevant topic and the existing question, answers, and explanation.
- Check correct and incorrect answers for both main and follow-up questions, including topics with different capitalization, new topics, and questions without a topic; verify topic scores and the overall course average.
