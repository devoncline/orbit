import { useCallback, useEffect, useRef, useState } from 'react'
import { createResultReveal } from '../services/resultReveal'

export default function useResultReveal() {
    const [resultReveal, setResultReveal] = useState(null)
    const current = useRef(null)
    useEffect(() => () => current.current?.cancel(), [])

    const showResult = useCallback(async (context, text, signal) => {
        current.current?.cancel()
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
        const reveal = createResultReveal({ text, signal, reducedMotion: preference.matches,
            onUpdate: (text) => setResultReveal({ context, text }),
        })
        current.current = reveal
        const change = () => { if (preference.matches) reveal.finish() }
        preference.addEventListener('change', change)
        try { await reveal.finished }
        finally {
            preference.removeEventListener('change', change)
            if (current.current === reveal) {
                current.current = null
                setResultReveal(null)
            }
        }
    }, [])
    return { resultReveal, showResult }
}
