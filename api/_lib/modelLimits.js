// Muse's budget includes internal reasoning as well as visible JSON/text.
// Keep room for reasoning, visual metadata and a complete structured response.
export const MODEL_OUTPUT_TOKENS = Object.freeze({
  lesson: 6000,
  analyzeCourse: 12000,
  recommendCourse: 2000,
  question: 3000,
  evaluateAnswer: 4000,
  conversation: 4000,
  activity: 4000,
})
