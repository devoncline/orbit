export default function StudyPath({ path }) {
    if (!path?.current) return null
    const previous = path.visited.at(-1)
    const next = path.upcoming[0]
    return <details className="study-path">
        <summary aria-label={`View learning path, step ${path.step}`}>
            <span className="study-path-preview">
                {previous && <span className="study-path-previous"><small>Visited</small><span>{previous.concept}</span></span>}
                <span className="study-path-current" aria-current="step"><small>Step {path.step} · Now</small><strong>{path.current.concept}</strong></span>
                <span className="study-path-next"><small>Next idea</small><span>{next?.concept || 'Chosen as you continue'}</span></span>
            </span>
        </summary>
        <p className="orbit-muted">A flexible path, not a checklist. Visited lessons are separate from mastery.</p>
        <ol>
            {path.visited.map((item, index) => <li key={`visited-${index}`}><small>Visited{item.understood ? ' · Felt ready' : ''}</small><span>{item.concept}</span></li>)}
            <li aria-current="step"><small>Step {path.step} · Current lesson</small><span>{path.current.concept}</span></li>
            {path.upcoming.map((item, index) => <li key={`next-${index}`}><small>Suggested next</small><span>{item.concept}</span></li>)}
        </ol>
        {!path.isCurrent && <p className="orbit-muted">Orbit will use your latest course context to choose what comes next.</p>}
    </details>
}
