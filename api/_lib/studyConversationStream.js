import { readStreamLines } from '../../src/services/streamLines.js'
import { MAX_STUDY_RESPONSE_LENGTH } from '../../src/services/studyConversation.js'

async function* metaEvents(body, signal) {
    let data = []
    let size = 0
    for await (const line of readStreamLines(body, { signal, maxLineLength: 131072 })) {
        if (!line) {
            if (data.length) {
                const payload = data.join('\n')
                if (payload === '[DONE]') return
                yield JSON.parse(payload)
            }
            data = []
            size = 0
        } else if (line.startsWith('data:')) {
            const part = line.slice(5).replace(/^ /, '')
            size += part.length
            if (size > 131072) throw new Error('Meta event too large')
            data.push(part)
        }
    }
}

// The streaming prompt puts response first. Decode only that JSON string;
// metadata, reasoning, JSON delimiters, and partial escape sequences stay private.
function responsePrefix(json) {
    const prefix = /^\s*\{\s*"response"\s*:\s*"/.exec(json)
    if (!prefix) {
        if (json.length > 80) throw new Error('Expected response first')
        return ''
    }
    let text = ''
    for (let index = prefix[0].length; index < json.length; index += 1) {
        const char = json[index]
        if (char === '"') break
        if (char === '\\') {
            const length = json[index + 1] === 'u' ? 6 : 2
            if (index + length > json.length) break
            text += JSON.parse(`"${json.slice(index, index + length)}"`)
            index += length - 1
        } else {
            if (char < ' ') throw new Error('Invalid JSON string')
            text += char
        }
    }
    // Do not briefly render half of a Unicode surrogate pair.
    if (/[\uD800-\uDBFF]$/.test(text)) text = text.slice(0, -1)
    if (text.length > MAX_STUDY_RESPONSE_LENGTH) throw new Error('Reply too long')
    return text
}

export async function streamMetaConversation(body, { signal, onDelta }) {
    let json = ''
    let visible = ''
    let outputPart
    for await (const event of metaEvents(body, signal)) {
        signal?.throwIfAborted()
        if (!event || typeof event.type !== 'string') throw new Error('Invalid Meta event')
        if (['error', 'response.failed', 'response.incomplete'].includes(event.type)) throw new Error('Meta generation failed')
        if (event.type === 'response.output_text.delta') {
            if (typeof event.delta !== 'string') throw new Error('Invalid text delta')
            const part = JSON.stringify([event.item_id, event.output_index, event.content_index])
            if (outputPart !== undefined && part !== outputPart) throw new Error('Unexpected output part')
            outputPart = part
            json += event.delta
            if (json.length > 16384) throw new Error('Reply too large')
            const next = responsePrefix(json)
            if (!next.startsWith(visible)) throw new Error('Inconsistent text delta')
            const delta = next.slice(visible.length)
            visible = next
            if (delta) onDelta(delta)
        }
        if (event.type === 'response.completed') {
            const content = event.response?.output?.filter((item) => item.type === 'message')
                .flatMap((item) => item.content || []).filter((item) => item.type === 'output_text')
            if (event.response?.status !== 'completed' || content?.length !== 1 || content[0].text !== json) {
                throw new Error('Incomplete conversation output')
            }
            const result = JSON.parse(json)
            if (result?.response !== visible) throw new Error('Inconsistent final reply')
            return result
        }
    }
    throw new Error('Conversation ended without completion')
}
