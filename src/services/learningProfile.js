// Authored choices only: no free text, diagnoses, scores, or inferred traits.
export const PROFILE_QUESTIONS = [
  { key: 'chunkSize', question: 'How much information do you like at once?', options: [
    { value: 'short', label: 'Short and focused', summary: 'Shorter explanations' },
    { value: 'balanced', label: 'A normal amount', summary: 'Balanced explanations' },
    { value: 'detailed', label: 'A little more detail', summary: 'Fuller explanations' },
  ] },
  { key: 'exampleTiming', question: 'Where should an explanation start?', options: [
    { value: 'early', label: 'With a concrete example', summary: 'Examples early' },
    { value: 'after', label: 'Explain the idea, then give an example', summary: 'The idea before the example' },
    { value: 'balanced', label: 'Let Orbit choose', summary: 'Examples where they help' },
  ] },
  { key: 'visualPreference', question: 'When would you like visual support?', options: [
    { value: 'often', label: 'Often, when a picture helps explain', summary: 'More useful visuals' },
    { value: 'helpful', label: 'When it adds something important', summary: 'Visuals when helpful' },
    { value: 'on_request', label: 'Let me ask for it', summary: 'Visuals when I ask' },
  ] },
  { key: 'guidance', question: 'How should Orbit help with the next step?', options: [
    { value: 'focused', label: 'One clear step, with quick understanding checks', summary: 'One clear step and quick check-ins' },
    { value: 'balanced', label: 'Suggest a step; check only when needed', summary: 'A suggested step, checks when needed' },
    { value: 'explore', label: 'Keep the tools in view so I can choose', summary: 'More choices in view' },
  ] },
  { key: 'reentrySupport', question: 'When you come back to a lesson, what helps?', options: [
    { value: 'where_left_off', label: 'Remind me where I left off', summary: 'Help me pick up where I stopped' },
    { value: 'recap', label: 'Give me a short recap', summary: 'A short recap when I return' },
    { value: 'continue', label: 'Just let me continue', summary: 'Continue without a recap' },
  ] },
]

export const DEFAULT_LEARNING_PROFILE = Object.freeze({ chunkSize: 'balanced', exampleTiming: 'balanced', visualPreference: 'helpful', guidance: 'balanced', reentrySupport: 'recap' })

export function normalizeLearningProfile(value) {
  return Object.fromEntries(PROFILE_QUESTIONS.map(({ key, options }) => [key,
    options.some((option) => option.value === value?.[key]) ? value[key] : DEFAULT_LEARNING_PROFILE[key],
  ]))
}

export function normalizeLearningPreferences(value) {
  const status = ['saved', 'dismissed'].includes(value?.status) ? value.status : 'new'
  return { status, profile: normalizeLearningProfile(status === 'saved' ? value.profile : undefined) }
}

export function learningProfileRequest(value) {
  return value === undefined ? {} : { learningProfile: normalizeLearningProfile(value) }
}

// Re-normalized on the server. Only authored sentences enter model instructions.
export function formatLearningProfile(value, { visuals = false, checkIns = false } = {}) {
  const profile = normalizeLearningProfile(value)
  return [
    'Teaching preferences guide style only. Course facts, explicit learner requests, correctness, safety, grading rules and output limits take priority. Never infer mastery, readiness, a diagnosis or a learner type from these preferences.',
    { short: 'Use short explanations in small conceptual steps, with one or two brief paragraphs. Aim for the shorter end of the response limits without omitting necessary information.',
      balanced: 'Use a concise, balanced amount of explanation.',
      detailed: 'Use slightly fuller explanations with a useful why or connection, within the existing word and character limits.' }[profile.chunkSize],
    { early: 'Lead teaching explanations with a concrete example, then connect it to the idea. Do not reveal an unanswered quiz or activity solution.',
      after: 'Explain the idea first, then connect it to a concrete example when useful.',
      balanced: 'Place examples near the ideas they clarify.' }[profile.exampleTiming],
    visuals ? { often: 'Lower the threshold for instructional imagery when it genuinely explains a relationship, process or structure. Still choose no visual for decorative imagery or concepts with no visual teaching value.',
      helpful: 'Use instructional imagery when it materially improves understanding; never add decorative imagery.',
      on_request: 'Prefer no automatic visual. Supply or reuse useful imagery when the learner explicitly asks, including Show me; this preference must never block that request.' }[profile.visualPreference] : '',
    checkIns ? profile.guidance === 'focused'
      ? 'When natural after an explanation or feedback, offer at most one brief optional understanding check. Do not interrupt, repeat checks already answered, force a quiz, or add questions to a fixed question schema.'
      : 'Offer a brief understanding check only when needed; avoid repeated interruptions.' : '',
    'These are editable defaults, not permanent abilities. Current learner instructions override them; do not mention these settings unless asked.',
  ].filter(Boolean).join('\n')
}

const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
function recapText(value) {
  if (typeof value !== 'string') return ''
  const plain = value.replace(/^\s*#{1,3}\s+.*$/gm, '')
    .replace(/^\s*[-*]\s+/gm, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
  if (plain.length <= 160) return plain
  const excerpt = plain.slice(0, 157)
  const sentence = /^([\s\S]*[.!?])\s/.exec(excerpt)
  return sentence ? sentence[1] : `${excerpt.replace(/\s+\S*$/, '').replace(/[,;:]$/, '')}…`
}
export function learningResumeGuidance(value, { lesson, summary, context = 'lesson', step = 1, restored = false } = {}) {
  const { reentrySupport } = normalizeLearningProfile(value)
  if (!lesson || reentrySupport === 'continue') return ''
  const concept = text(lesson.concept || lesson.topic, 120)
  // Use the full lesson only when the saved summary was a truncated excerpt of it.
  // A summary of actual practice or discussion must keep that learning context.
  const source = typeof summary === 'string' && lesson.content?.startsWith(summary.trim()) ? lesson.content : summary
  const recap = recapText(source) || recapText(lesson.content)
  if (reentrySupport === 'recap') return `Last time: ${recap}${restored ? ' Your lesson is ready to revisit; activities and quizzes start fresh.' : ''}`
  const tool = { lesson: 'the lesson', visual: 'Show me', example: 'an example', activity: 'an activity', quiz: 'Quiz me', conversation: 'Talk it through' }[context] || 'the lesson'
  return `You left off with ${tool} on ${concept}, lesson ${Number.isInteger(step) && step > 0 ? Math.min(step, 10000) : 1}. ${recap} ${restored ? 'Your saved lesson is ready. Activities and quiz questions start fresh; choose their Study tool to begin again.' : 'Your current work is still here. Use Study tools whenever you want another approach.'}`
}
