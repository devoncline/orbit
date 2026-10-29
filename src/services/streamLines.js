// Shared framing only: neither provider events nor secrets belong in UI state.
export async function* readStreamLines(body, { signal, maxLineLength = 8192 } = {}) {
    signal?.throwIfAborted()
    if (!body?.getReader) throw new Error('Missing response stream')
    const reader = body.getReader()
    const decoder = new TextDecoder('utf-8', { fatal: true })
    let pending = ''
    const cancel = () => { void reader.cancel().catch(() => {}) }
    signal?.addEventListener('abort', cancel, { once: true })
    try {
        while (true) {
            signal?.throwIfAborted()
            const { done, value } = await reader.read()
            signal?.throwIfAborted()
            pending += done ? decoder.decode() : decoder.decode(value, { stream: true })
            let end
            while ((end = pending.indexOf('\n')) !== -1) {
                if (end > maxLineLength) throw new Error('Stream event too large')
                yield pending.slice(0, end).replace(/\r$/, '')
                pending = pending.slice(end + 1)
            }
            if (pending.length > maxLineLength) throw new Error('Stream event too large')
            if (done) {
                if (pending) yield pending.replace(/\r$/, '')
                return
            }
        }
    } finally {
        signal?.removeEventListener('abort', cancel)
        await reader.cancel().catch(() => {})
        reader.releaseLock()
    }
}
