const thinkingCopy = {
  thinking: { status: 'Orbit is thinking...', fragments: ['making connections', 'thinking it through'] },
  lesson: { status: 'Orbit is preparing a short lesson...', fragments: ['finding the next idea', 'connecting the lesson'] },
  next: { status: 'Orbit is choosing the next useful lesson...', fragments: ['checking your progress', 'finding the next idea'] },
  simplify: { status: 'Orbit is trying a different approach...', fragments: ['finding a clearer angle', 'connecting the idea'] },
  example: { status: 'Orbit is finding an example...', fragments: ['finding a clearer angle', 'matching an example'] },
  activity: { status: 'Orbit is preparing something to try...', fragments: ['choosing something to try', 'keeping it focused'] },
  response: { status: 'Orbit is looking at your response...', fragments: ['reading your response', 'connecting the ideas'] },
  conversation: { status: 'Orbit is thinking about that...', fragments: ['thinking it through', 'connecting the ideas'] },
  quiz: { status: 'Orbit is building your question...', fragments: ['checking what matters', 'building a question'] },
  evaluation: { status: 'Orbit is changing the approach...', fragments: ['reading your response', 'finding a clearer angle'] },
  recommendation: { status: 'Orbit is updating your recommendation...', fragments: ['checking your progress', 'finding a starting point'] },
}

export function getThinkingCopy(context) {
  return Object.hasOwn(thinkingCopy, context) ? thinkingCopy[context] : thinkingCopy.thinking
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
  }

  updateMotion()
  preference.addEventListener('change', updateMotion)
  return () => {
    element.style.transform = window.getComputedStyle(element).transform
    animation?.cancel()
    preference.removeEventListener('change', updateMotion)
  }
}
