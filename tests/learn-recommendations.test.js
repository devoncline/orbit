import assert from 'node:assert/strict'
import { test } from 'node:test'
import { learnRecommendations } from '../src/services/learnRecommendations.js'
import { learningPathContextKey } from '../src/services/learningPath.js'
import { carouselGeometry, carouselPose } from '../src/components/Carousel/carouselMotion.js'
import { readFileSync } from 'node:fs'

const today = '2026-11-02'

test('Portfolio Mode supplies four ordinary recommendation cards only when the genuine list is empty', () => {
  const courses = Object.freeze([]), threads = Object.freeze([])
  assert.deepEqual(learnRecommendations(courses, threads, today), [])
  assert.deepEqual(learnRecommendations(courses, threads, today, { portfolioMode: false }), [])
  const examples = learnRecommendations(courses, threads, today, { portfolioMode: true })
  assert.deepEqual(examples.map(item => item.topic), ['Orbital Motion', 'Music Theory', 'Photosynthesis', 'The Psychology of Habits'])
  assert.equal(new Set(examples.map(item => item.id)).size, 4)
  for (const item of examples) {
    assert.deepEqual(Object.keys(item).sort(), ['courseName', 'id', 'kind', 'reason', 'topic'])
    assert.equal(item.kind, 'new')
    assert.equal(item.courseName, null)
    assert.ok(item.reason)
  }
  assert.deepEqual(learnRecommendations(courses, threads, today, { portfolioMode: true }), examples)
})

test('Portfolio Mode preserves genuine course and related-interest recommendations without padding the list', () => {
  for (const courses of [
    [{ name: 'Biology', importantTopics: ['Cells'] }],
    [{ name: 'Music theory' }],
  ]) {
    const before = JSON.stringify(courses)
    const genuine = learnRecommendations(courses, [], today)
    assert.equal(genuine.length, 1)
    assert.deepEqual(learnRecommendations(courses, [], today, { portfolioMode: true }), genuine)
    assert.equal(JSON.stringify(courses), before)
  }
})

test('empty returning visitors get examples without inventing or changing saved learning or duplicating a matching space', () => {
  const courses = [{ name: 'The psychology of habits', mastery: { overall: 35, topics: { Cues: 35 } } }]
  const threads = [{ courseName: courses[0].name, topic: 'Cues', resume: { lesson: { topic: 'Cues', content: 'A saved lesson.' } } }]
  const before = JSON.stringify({ courses, threads })
  assert.deepEqual(learnRecommendations(courses, threads, today), [])
  const examples = learnRecommendations(courses, threads, today, { portfolioMode: true })
  assert.equal(examples.length, 4)
  assert.equal(examples[3].kind, 'existing')
  assert.equal(examples[3].courseName, courses[0].name)
  assert.equal(JSON.stringify({ courses, threads }), before)
})

test('Learn recommendations exclude current, visited, practiced and excluded topics without changing their source data', () => {
  const course = { name: 'Biology', importantTopics: ['Photosynthesis', 'Energy transfer', 'Cells', 'Osmosis', 'Genetics', 'Ecology'],
    mastery: { overall: 35, topics: { Cells: 35 } }, recentLearning: { topic: 'Osmosis', updatedAt: today },
    learnerPosition: { exclusions: [{ topic: 'Genetics', type: 'notYet' }] },
    upcomingWork: [{ topic: 'Ecology', title: 'Ecology quiz', date: '2026-11-05' }] }
  const threads = [{ courseName: 'Biology', requestedTopic: ' photosynthesis ', resume: {
    lesson: { topic: 'Photosynthesis', concept: 'Capturing light' }, learningPath: { visited: [{ topic: 'Energy transfer', concept: 'Food webs' }] },
  } }]
  const before = JSON.stringify([course, threads])
  const results = learnRecommendations([course], threads, today)
  assert.deepEqual(results.filter(item => item.kind === 'existing').map(item => item.topic), ['Ecology'])
  assert.match(results[0].reason, /Ecology quiz/)
  assert.equal(JSON.stringify([course, threads]), before)
})

test('fresh saved next concepts are recommendations, while stale plans and previous concepts are not', () => {
  const course = { name: 'Music theory', recentLearning: { topic: 'Major scales', updatedAt: today } }
  const thread = { courseName: course.name, topic: 'Major scales', resume: { lesson: { topic: 'Major scales', concept: 'Scale patterns' },
    learningPath: { contextKey: learningPathContextKey(course, today), upcoming: [
      { topic: 'Music theory', concept: 'Major chords' }, { topic: 'Major scales', concept: 'Scale patterns' },
    ] } } }
  const current = learnRecommendations([course], [thread], today)
  assert.ok(current.some(item => item.topic === 'Major chords' && item.courseName === course.name && /Scale patterns/.test(item.reason)))
  assert.ok(current.every(item => !['Major scales', 'Scale patterns'].includes(item.topic)))
  assert.ok(learnRecommendations([course], [thread], '2026-11-03').every(item => item.topic !== 'Major chords'))
})

test('later unstudied course material remains available after the shared top four choices have been covered', () => {
  const topics = ['One', 'Two', 'Three', 'Four', 'Five', 'Six']
  const course = { name: 'A class', importantTopics: topics }
  const threads = topics.slice(0, 4).map(topic => ({ courseName: course.name, topic }))
  assert.deepEqual(learnRecommendations([course], threads, today).map(item => item.topic), ['Five', 'Six'])
})

test('related interests offer New space suggestions without duplicating spaces, history, or excluded topics', () => {
  const course = { name: 'Orbital motion' }
  const result = learnRecommendations([course], [], today)
  assert.deepEqual(result.map(item => [item.kind, item.topic, item.courseName]), [['new', 'Black holes', null]])
  assert.match(result[0].reason, /Orbital motion/)
  assert.equal(learnRecommendations([course, { name: 'Black holes' }], [], today).length, 0)
  assert.equal(learnRecommendations([course], [{ courseName: course.name, topic: 'BLACK HOLES' }], today).length, 0)
  assert.equal(learnRecommendations([{ ...course, learnerPosition: { exclusions: [{ topic: 'Black holes', type: 'skip' }] } }], [], today).length, 0)
})

test('zero, one and many recommendations are bounded, deduplicated, stable and spread across spaces', () => {
  assert.deepEqual(learnRecommendations([], [], today), [])
  assert.equal(learnRecommendations([{ name: 'History', importantTopics: ['Rome', 'rome'] }], [], today).length, 1)
  const courses = Array.from({ length: 5 }, (_, index) => ({ name: `Class ${index}`, importantTopics: Array.from({ length: 20 }, (_, i) => `Topic ${i}`) }))
  const results = learnRecommendations(courses, [], today)
  assert.equal(results.length, 12)
  assert.equal(new Set(results.map(item => item.id)).size, 12)
  assert.deepEqual(results.slice(0, 5).map(item => item.courseName), courses.map(course => course.name))
  assert.deepEqual(learnRecommendations(courses, [], today), results)
})

test('carousel sizing keeps a readable card inside narrow containers and clips the moving track, including long text', () => {
  // Geometry/CSS contracts; these do not substitute for real-device layout inspection.
  for (const width of [240, 272, 288, 320, 390, 768, 1440]) {
    for (const count of [0, 1, 12]) {
      const geometry = carouselGeometry(width, count)
      assert.ok(geometry.cardWidth <= width)
      assert.ok(geometry.cardWidth >= Math.min(200, width))
      assert.ok(Number.isFinite(geometry.span))
    }
  }
  const geometry = carouselGeometry(320, 3)
  assert.equal(carouselPose(0, 0, geometry).visible, true)
  assert.equal(carouselPose(1, 0, geometry).visible, true, 'A neighboring card peeks into view')
  assert.equal(carouselPose(2, 0, geometry).visible, false)
  assert.match(carouselPose(1, 0, { ...geometry, reduced: true }).transform, /scale\(1\)/)
  const css = readFileSync(new URL('../src/components/Carousel/Carousel.css', import.meta.url), 'utf8')
  const learnCss = readFileSync(new URL('../src/components/LearnScreen.css', import.meta.url), 'utf8')
  assert.match(css, /overflow: clip/)
  assert.match(css, /touch-action: pan-y pinch-zoom/)
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(learnCss, /overflow-wrap: anywhere/)
  assert.match(learnCss, /prefers-reduced-motion: reduce/)
  assert.doesNotMatch(css, /100vw|min-width: \d+px/)
})

test('carousel edge fading blends into the page without covering the centered card or fading a single card', () => {
  for (const width of [240, 272, 288, 320, 390, 768, 1440]) {
    const { cardWidth } = carouselGeometry(width, 5)
    const fadeWidth = Math.min(36, Math.max(12, width * .05))
    assert.ok(fadeWidth < (width - cardWidth) / 2, `The centered card stays beyond the fade at ${width}px`)
  }
  const css = readFileSync(new URL('../src/components/Carousel/Carousel.css', import.meta.url), 'utf8')
  const fading = css.match(/\.orbit-carousel \.carousel-viewport\[data-draggable='true'\]\s*\{([^}]+)\}/)?.[1]
  assert.ok(fading)
  assert.match(fading, /linear-gradient\(to right, transparent/)
  assert.match(fading, /-webkit-mask-image: var\(--carousel-edge-mask\)/)
  assert.match(fading, /\bmask-image: var\(--carousel-edge-mask\)/)
  assert.doesNotMatch(fading, /blur|animation|transition|pointer-events/)
  assert.doesNotMatch(css, /\[data-single='true'\][^{]*\{[^}]*(?:mask|filter)/)
})

test('four-card looping keeps both neighbors visible at desktop/mobile widths and preserves poses when rebased', () => {
  for (const width of [240, 272, 288, 320, 390, 640, 768]) {
    for (const reduced of [false, true]) {
      const geometry = { ...carouselGeometry(width, 4), count: 4, loop: true, reduced }
      assert.equal(carouselPose(3, 0, geometry).visible, true, `Left neighbor at ${width}px`)
      assert.equal(carouselPose(1, 0, geometry).visible, true, `Right neighbor at ${width}px`)
      assert.match(carouselPose(3, 0, geometry).transform, /translate3d\(-/)
      assert.doesNotMatch(carouselPose(1, 0, geometry).transform, /translate3d\(-/)
      for (let index = 0; index < 4; index++) {
        for (const position of [-8, -4, 0, 4, 8]) {
          assert.deepEqual(carouselPose(index, position, geometry), carouselPose(index, 0, geometry))
        }
      }
    }
  }
})
