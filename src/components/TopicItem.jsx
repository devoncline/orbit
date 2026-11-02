import './TopicItem.css'
import MasteryBadge from './MasteryBadge'

export default function TopicItem({ topic, detail, meta, rank, current, onClick, action, children }) {
  return <div className="topic-item">
    <button className="topic-item-open" onClick={onClick} aria-current={current ? 'true' : undefined}>
      {rank ? <MasteryBadge rank={rank} size="compact" decorative /> : <span className="topic-orbit" aria-hidden="true" />}
      <span className="topic-item-copy"><strong>{topic}</strong>{rank && <span className="topic-item-rank">{rank.label}</span>}{detail && <span>{detail}</span>}{meta && <small>{meta}</small>}</span>
      {action && <span className="topic-item-action">{action}<span aria-hidden="true"> ↗</span></span>}
    </button>
    {children}
  </div>
}
