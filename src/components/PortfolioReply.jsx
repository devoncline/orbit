import { PORTFOLIO_MESSAGE } from '../services/portfolioMode'
import { DEMO_VIDEO_URL } from '../services/demoUsage'
import { OrbitResponse } from './OrbitSignal'
import StudyContent from './StudyContent'

export function PortfolioContent() {
  return <>
    <StudyContent content={PORTFOLIO_MESSAGE} />
    <a className="orbit-button" href={DEMO_VIDEO_URL} target="_blank" rel="noopener noreferrer">Watch the Demo</a>
  </>
}

export default function PortfolioReply({ message }) {
  return <article className="study-exchange" data-portfolio-reply>
    {message && <div className="study-message study-message-learner" aria-label="Your message"><p>{message}</p></div>}
    <div className="study-message study-message-orbit" aria-label="Orbit reply">
      <OrbitResponse context="conversation" pending={false}>
        <PortfolioContent />
      </OrbitResponse>
    </div>
  </article>
}
