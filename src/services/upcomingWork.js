// Only complete calendar dates are scheduled. Ambiguous extracted text stays visible for review.
export function parseWorkDate(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export function collectUpcomingWork(courses, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const upcoming = []
  const unconfirmed = []
  const past = []
  for (const course of courses) {
    for (const [index, work] of (Array.isArray(course.upcomingWork) ? course.upcomingWork : []).entries()) {
      if (!work || typeof work.title !== 'string' || !work.title.trim()) continue
      const date = parseWorkDate(work.date)
      const entry = { title: work.title, courseName: course.name, date, rawDate: typeof work.date === 'string' ? work.date : '', key: `${course.name}-${index}` }
      if (!date) unconfirmed.push(entry)
      else if (date < today) past.push(entry)
      else upcoming.push(entry)
    }
  }
  upcoming.sort((a, b) => a.date - b.date)
  past.sort((a, b) => b.date - a.date)
  return { upcoming, unconfirmed, past }
}

export function formatWorkDate(date, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  if (+date === +today) return 'Today'
  if (+date === +tomorrow) return 'Tomorrow'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })
}
