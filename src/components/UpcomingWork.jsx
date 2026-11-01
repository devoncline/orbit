import { collectUpcomingWork, formatWorkDate, parseWorkDate } from '../services/upcomingWork'

export default function UpcomingWork({ courses, preview = false, onSelectSpace, today }) {
  const now = parseWorkDate(today) || new Date()
  const { upcoming, unconfirmed, past } = collectUpcomingWork(courses, now)
  const visible = preview ? upcoming.slice(0, 3) : upcoming

  function list(entries) {
    return <ul className="upcoming-list">{entries.map((entry) => (
      <li key={entry.key}>
        <span className="upcoming-date">{entry.date ? <time dateTime={entry.rawDate}>{formatWorkDate(entry.date, now)}</time> : entry.rawDate || 'No date yet'}</span>
        {onSelectSpace ? <button className="orbit-text-button" onClick={() => onSelectSpace(entry.courseName)}><strong>{entry.title}</strong><small>{entry.courseName}</small></button>
          : <div className="upcoming-item"><strong>{entry.title}</strong></div>}
      </li>
    ))}</ul>
  }

  return <>
    {visible.length ? list(visible) : <p className="orbit-muted upcoming-empty">No upcoming dates.</p>}
    {preview && unconfirmed.length > 0 && <p className="orbit-muted">{unconfirmed.length} {unconfirmed.length === 1 ? 'item needs' : 'items need'} a clear date. See Calendar.</p>}
    {!preview && unconfirmed.length > 0 && <section className="calendar-group"><h2>Dates to confirm</h2><p className="orbit-muted">These dates aren’t clear enough to put on the calendar. Check the original material.</p>{list(unconfirmed)}</section>}
    {!preview && past.length > 0 && <details className="calendar-group"><summary>Earlier dates</summary>{list(past)}</details>}
  </>
}
