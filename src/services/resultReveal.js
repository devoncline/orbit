export const RESULT_REVEAL_INTERVAL = 70

// A short display transition for an already complete, validated result.
// This has no network input and never delays a long result beyond 630ms.
export function createResultReveal({ text, onUpdate, signal, reducedMotion = false, schedule = setTimeout, unschedule = clearTimeout }) {
    const words = text.match(/\S+\s*/gu) || []
    const frames = words.length <= 12 ? 1 : Math.min(10, Math.ceil(words.length / 6))
    let frame = 0
    let timer = null
    let settled = false
    let resolve, reject
    const finished = new Promise((done, fail) => { resolve = done; reject = fail })

    function cleanup() {
        if (timer !== null) unschedule(timer)
        timer = null
        signal?.removeEventListener('abort', abort)
    }
    function finish() {
        if (settled) return
        settled = true
        cleanup()
        resolve()
    }
    function cancel(reason = new DOMException('Cancelled', 'AbortError')) {
        if (settled) return
        settled = true
        cleanup()
        reject(reason)
    }
    function abort() { cancel(signal.reason) }
    function reveal() {
        if (settled) return
        frame += 1
        if (frame === frames) return finish()
        onUpdate(words.slice(0, Math.ceil(words.length * frame / frames)).join(''))
        timer = schedule(reveal, RESULT_REVEAL_INTERVAL)
    }
    if (signal?.aborted) abort()
    else {
        signal?.addEventListener('abort', abort, { once: true })
        if (reducedMotion) finish()
        else reveal()
    }
    return { finished, finish, cancel }
}
