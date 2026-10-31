export default function StudyPath({ path }) {
    if (!path?.current) return null
    const next = path.upcoming[0]
    return <details className="study-path">
        <summary>
            <span className="study-path-label">Study path</span>
                <span className="study-path-next"><small>Next idea</small><span>{next?.concept || 'Chosen as you continue'}</span></span>
        </summary>
        <div className="study-path-content">
        <ol>
            {path.visited.map((item, index) => <li key={`visited-${index}`}><small>Visited{item.understood ? ' · Felt ready' : ''}</small><span>{item.concept}</span></li>)}
            <li aria-current="step"><small>Lesson {path.step} · Current lesson</small><strong>{path.current.concept}</strong></li>
            {path.upcoming.map((item, index) => <li key={`next-${index}`}><small>Suggested next</small><span>{item.concept}</span></li>)}
        </ol>
        <p className="orbit-muted">These suggestions can change as you learn. Visiting a lesson does not change your mastery.</p>
        {!path.isCurrent && <p className="orbit-muted">Orbit will use your updated starting point to suggest the next lesson.</p>}
        </div>
    </details>
}
