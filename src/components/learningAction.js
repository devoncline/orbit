// Wording follows the supplied task; it never infers missed answers or deadlines.
export function learningAction(task, spaceName, resuming = false) {
  if (resuming) return spaceName?.length <= 32 ? `Return to ${spaceName}` : 'Resume this session'
  const text = typeof task === 'string' ? task.trim() : ''
  if (text.endsWith('?')) return 'Show me'
  const match = /^(learn about|learn|understand|explore|review|revisit|practice|prepare for)\s+(.+?)[.!]?$/i.exec(text)
  if (!match) return 'Try this'
  const [, verb, topic] = match
  const action = /review|revisit/i.test(verb) ? 'Review' : /practice/i.test(verb) ? 'Practice' : /prepare/i.test(verb) ? 'Prepare for' : 'Show me'
  return topic.length <= 36 ? `${action} ${topic}` : `${action} ${action === 'Prepare for' ? 'this' : 'this idea'}`
}
