import { MAX_STUDY_RESPONSE_LENGTH } from './studyConversation.js'
import { suggestedLearningAnchor } from './studyLearningContext.js'
import { readStreamLines } from './streamLines.js'
import { nativeLessonVisual } from './learningPath.js'

export async function readStudyConversationStream(response, { signal, onDelta, topic }) {
    let text = ''
    try {
        signal?.throwIfAborted()
        if (!response.headers?.get('content-type')?.includes('application/x-ndjson')) throw new Error('Invalid stream type')
        // Completion includes bounded visual/text/anchor fields and their JSON escapes.
        // A reused visual comes from context, outside the provider's output-size bound.
        for await (const line of readStreamLines(response.body, { signal, maxLineLength: 32768 })) {
            if (!line.trim()) continue
            const event = JSON.parse(line)
            if (event?.type === 'delta') {
                if (typeof event.text !== 'string' || text.length + event.text.length > MAX_STUDY_RESPONSE_LENGTH) throw new Error('Invalid delta')
                text += event.text
                if (event.text) onDelta?.(event.text)
            } else if (event?.type === 'complete') {
                if (typeof event.response !== 'string' || !event.response.trim() ||
                    event.response !== text.trim() || event.response.trim().split(/\s+/).length > 100 ||
                    !['connection', 'confusion', 'curiosity', 'understanding', 'neutral'].includes(event.signal)) {
                    throw new Error('Invalid final reply')
                }
                signal?.throwIfAborted()
                const visual = nativeLessonVisual(event.visual)
                return {
                    response: event.response,
                    signal: event.signal,
                    ...suggestedLearningAnchor(event.anchor, topic, event.signal),
                    ...(visual ? { visual } : {}),
                }
            } else {
                throw new Error('Invalid or failed stream event')
            }
        }
        throw new Error('Missing completion')
    } catch (error) {
        signal?.throwIfAborted()
        if (error.name === 'AbortError') throw error
        throw new Error('The reply was interrupted. Please try again.', { cause: error })
    }
}
