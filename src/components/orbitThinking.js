const thinkingCopy = {
  thinking: { status: 'Orbit is thinking...', fragments: ['making connections', 'thinking it through', 'following the idea', 'narrowing the focus', 'finding a useful angle', 'bringing it together'] },
  lesson: { status: 'Orbit is preparing a short lesson...', fragments: ['finding the next idea', 'connecting the lesson', 'checking where to begin', 'narrowing the focus', 'choosing one useful idea', 'keeping this manageable'] },
  next: { status: 'Orbit is choosing the next useful lesson...', fragments: ['checking your progress', 'finding the next idea', 'building on this lesson', 'choosing a useful step', 'connecting what you know', 'keeping a steady pace'] },
  simplify: { status: 'Orbit is trying a different approach...', fragments: ['finding a clearer angle', 'connecting the idea', 'trying another route', 'simplifying the idea', 'breaking it into steps', 'starting with the basics'] },
  example: { status: 'Orbit is finding an example...', fragments: ['finding a clearer angle', 'matching an example', 'making it concrete', 'connecting to real life', 'trying another way in', 'making the idea familiar'] },
  activity: { status: 'Orbit is preparing something to try...', fragments: ['choosing something to try', 'keeping it focused', 'turning this into practice', 'finding a quick challenge', 'making it hands-on', 'choosing one useful step'] },
  response: { status: 'Orbit is looking at your response...', fragments: ['reading your response', 'connecting the ideas', 'following your approach', 'checking the reasoning', 'noticing what worked', 'finding a useful next step'] },
  conversation: { status: 'Orbit is thinking about that...', fragments: ['thinking it through', 'connecting the ideas', 'following your question', 'checking the lesson', 'working through that idea', 'tracing the connection'] },
  quiz: { status: 'Orbit is building your question...', fragments: ['checking what matters', 'building a question', 'narrowing the focus', 'choosing what to test', 'finding a fair challenge', 'checking this concept'] },
  evaluation: { status: 'Orbit is changing the approach...', fragments: ['reading your response', 'finding a clearer angle', 'changing the approach', 'checking the tricky part', 'trying another route', 'simplifying the idea'] },
  recommendation: { status: 'Orbit is updating your recommendation...', fragments: ['checking your progress', 'finding a starting point', 'looking at what is next', 'connecting your course', 'choosing a useful focus', 'finding a manageable step'] },
}

export function getThinkingCopy(context, sequence = 0) {
  const { status, fragments } = Object.hasOwn(thinkingCopy, context) ? thinkingCopy[context] : thinkingCopy.thinking
  const index = Math.abs(Math.trunc(sequence)) % fragments.length
  return { status, fragments: [fragments[index], fragments[(index + 1) % fragments.length]] }
}

export function nextThinkingRequest(previous, thinking, context) {
  const key = thinking ? context : ''
  if (previous?.key === key) return previous
  return { key, sequence: previous ? previous.sequence + (thinking ? 1 : 0) : 0 }
}

// Request state, rather than visible content, owns the thinking lifetime. A quiz
// can supersede a cancelled activity/conversation while its cleanup is pending.
export function studyThinkingContext({ loadingLesson, loadingActivity, loadingConversation, loadingQuestion, loadingEvaluation }) {
  if (loadingQuestion) return 'quiz'
  if (loadingEvaluation) return 'evaluation'
  if (loadingLesson) return loadingLesson
  if (loadingActivity) return loadingActivity === 'evaluate' ? 'response' : 'activity'
  if (loadingConversation) return 'conversation'
  return ''
}

// The browser animates transforms without a JS frame loop or React updates.
// Freeze the current pose on cleanup so even an interrupted sway settles from
// its actual angle, rather than snapping to a new animation's first frame.
export function startThinkingMotion(element, thinking) {
  if (!element?.animate || typeof window.matchMedia !== 'function') return
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  let animation

  function updateMotion() {
    const from = window.getComputedStyle(element).transform
    animation?.cancel()
    element.style.transform = ''
    if (preference.matches) return
    if (!thinking && from === 'none') return

    const rest = 'translateY(0px) rotate(0deg)'
    const frames = thinking ? [
      { transform: from, offset: 0, easing: 'ease-in-out' },
      { transform: 'translateY(-3px) rotate(-4deg)', offset: 0.28, easing: 'ease-in-out' },
      { transform: 'translateY(1px) rotate(3deg)', offset: 0.58, easing: 'ease-in-out' },
      { transform: 'translateY(-1px) rotate(-1deg)', offset: 0.8, easing: 'ease-in-out' },
      { transform: from, offset: 1 },
    ] : [{ transform: from }, { transform: rest }]
    animation = element.animate(frames, thinking
      ? { duration: 8400, iterations: Infinity }
      : { duration: 900, easing: 'ease-out' })
    // Cancellation on request changes/unmount is an expected animation outcome.
    animation.finished?.catch(() => {})
  }

  updateMotion()
  preference.addEventListener('change', updateMotion)
  return () => {
    element.style.transform = window.getComputedStyle(element).transform
    animation?.cancel()
    preference.removeEventListener('change', updateMotion)
  }
}
