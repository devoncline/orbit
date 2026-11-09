export const DEMO_VIDEO_URL = 'https://youtu.be/-xQGO-GYUVg'

export const PORTFOLIO_MODE = 'portfolio'
export const PORTFOLIO_MESSAGE = `Well, this is awkward. 👽

I'd love to help you explore that, but my creator decided that paying for AI credits forever wasn't exactly a sustainable business model. Apparently, running on curiosity and good vibes isn't enough.

Orbit was originally built for Meta's AI Hackathon, and the live AI features have since been retired.

But don't worry! You can still see me in action in the original demo.`

export const PORTFOLIO_RESPONSE = Object.freeze({ mode: PORTFOLIO_MODE, response: PORTFOLIO_MESSAGE, demoUrl: DEMO_VIDEO_URL })

// Control flow, not a failed request: stop teaching consumers before they can
// interpret this response as a lesson, score, extracted file, or streamed text.
export class PortfolioResponse extends Error {
  constructor() {
    super(PORTFOLIO_MESSAGE)
    this.code = 'orbit_portfolio_mode'
  }
}

export const isPortfolioResponse = value => value?.code === 'orbit_portfolio_mode'
