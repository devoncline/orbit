export const STREAM_DISPLAY_INTERVAL = 80

// Network deltas enter immediately; a single timer reveals small word groups.
// finish() waits for the display to catch up, never invents text, and leaves
// incomplete output out of conversation state when a request fails or aborts.
export function createStreamDisplay({ onUpdate, signal, reducedMotion = false, schedule = setTimeout, unschedule = clearTimeout }) {
    let received = ''
    let shown = 0
    let timer = null
    let ended = false
    let stopped = false
    let resolveDrain
    let rejectDrain
    let drain

    function stop(reason = new DOMException('Cancelled', 'AbortError')) {
        stopped = true
        if (timer !== null) unschedule(timer)
        timer = null
        signal?.removeEventListener('abort', abort)
        rejectDrain?.(reason)
    }

    function abort() { stop(signal.reason) }

    function queue(delay = STREAM_DISPLAY_INTERVAL) {
        if (timer === null && !stopped && !reducedMotion && shown < received.length) timer = schedule(reveal, delay)
    }

    function reveal() {
        timer = null
        if (stopped) return
        const remaining = received.slice(shown)
        // Larger bursts catch up a little faster, still in small readable groups.
        const words = remaining.length > 400 ? 5 : remaining.length > 160 ? 3 : 2
        // Hold a trailing partial word until a delimiter (or completion) arrives.
        // Long unbroken text still advances in bounded chunks.
        const group = remaining.match(new RegExp(`^(?:\\s*\\S+${ended ? '(?:\\s+|$)' : '\\s+'}){1,${words}}`, 'u'))?.[0]
            || (ended || Array.from(remaining).length >= 64 ? remaining : '')
        if (!group) return
        const sentence = group.match(/^.*?[.!?][”"')\]]*(?:\s+|$)/su)?.[0] || group
        const piece = Array.from(sentence).slice(0, 64).join('')
        shown += piece.length
        onUpdate(received.slice(0, shown))
        if (ended && shown === received.length) {
            signal?.removeEventListener('abort', abort)
            resolveDrain?.()
        } else {
            const pause = /[.!?][”"')\]]*\s*$/u.test(piece) ? 60 : /[,;:]\s*$/u.test(piece) ? 25 : 0
            queue(STREAM_DISPLAY_INTERVAL + pause)
        }
    }

    signal?.throwIfAborted()
    signal?.addEventListener('abort', abort, { once: true })
    function finishImmediately() {
        if (timer !== null) unschedule(timer)
        timer = null
        if (shown !== received.length) { shown = received.length; onUpdate(received) }
        signal?.removeEventListener('abort', abort)
        resolveDrain?.()
    }
    return {
        append(text) {
            if (stopped || ended || !text) return
            received += text
            queue()
        },
        finish() {
            if (stopped) return Promise.reject(signal?.reason || new DOMException('Cancelled', 'AbortError'))
            ended = true
            if (reducedMotion) finishImmediately()
            if (shown === received.length) {
                signal?.removeEventListener('abort', abort)
                return Promise.resolve()
            }
            if (!drain) drain = new Promise((resolve, reject) => { resolveDrain = resolve; rejectDrain = reject })
            queue()
            return drain
        },
        setReducedMotion(value) {
            reducedMotion = value
            if (stopped) return
            if (value) {
                if (timer !== null) unschedule(timer)
                timer = null
                if (ended) finishImmediately()
            } else queue()
        },
        cancel: stop,
    }
}
