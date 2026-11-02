import './TopicItem.css'

// Optional presentation slot only; ranks and mastery calculations belong elsewhere.
export default function TopicItem({ topic, detail, meta, mastery, current, onClick, action, children }) {
  return <div className="topic-item">
    <button className="topic-item-open" onClick={onClick} aria-current={current ? 'true' : undefined}>
      <span className="topic-orbit" aria-hidden="true" />
      <span className="topic-item-copy"><strong>{topic}</strong>{detail && <span>{detail}</span>}{meta && <small>{meta}</small>}</span>
      {mastery && <span className="topic-item-mastery">{mastery}</span>}
      {action && <span className="topic-item-action">{action}<span aria-hidden="true"> ↗</span></span>}
    </button>
    {children}
  </div>
}
