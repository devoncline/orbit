export default function StudyPath({ path }) {
    if (!path?.current || !path.upcoming.length) return null
    return <div className="study-next-ideas">
        <ol aria-label="Suggested next ideas">{path.upcoming.map((item, index) => <li key={index}><small>{index === 0 ? 'Next idea' : 'Then'}</small><span>{item.concept}</span></li>)}</ol>
    </div>
}
