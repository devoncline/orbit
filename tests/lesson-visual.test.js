import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { Window } from 'happy-dom'
import { acceptPathLesson, learningPathContextKey, nativeLessonVisual, normalizeLessonVisual, recommendStudyAction } from '../src/services/learningPath.js'
import { compactThreadResume } from '../src/services/learnerMemory.js'
import handler from '../api/generate-study-lesson.js'

let server, LessonVisual, StudySession, StudyPath, dom
const data = [{ label: 'State', detail: 'A component remembers a value.' }, { label: 'Render', detail: 'React calculates the next view.' }]
const visual = { type: 'diagram', purpose: 'Connect a state update to rendering.', data, focus: 'Updating the view', links: [{ from: 0, to: 1, label: 'An update requests a render' }] }
const lesson = { topic: 'State', concept: 'Updating a component', content: 'Updating state asks React to render the component again.' }
const course = { name: 'React', mastery: { overall: 40, topics: {} } }
const plant = { type: 'concept_illustration', purpose: 'Light supplies energy for photosynthesis.', focus: 'Plant',
  data: [{ label: 'Sunlight', detail: 'Supplies light energy.', symbol: 'sun' }, { label: 'Plant', detail: 'Uses light energy to make sugars.', symbol: 'plant' }, { label: 'Water', detail: 'Supplied through the roots.', symbol: 'water' }],
  links: [{ from: 0, to: 1, label: 'Supplies light energy' }, { from: 2, to: 1, label: 'Supplies water' }] }

before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  LessonVisual = (await server.ssrLoadModule('/src/components/LessonVisual.jsx')).default
  StudySession = (await server.ssrLoadModule('/src/components/StudySession.jsx')).default
  StudyPath = (await server.ssrLoadModule('/src/components/StudyPath.jsx')).default
  dom = new Window()
})
after(async () => { await server?.close(); await dom?.happyDOM.close() })
function render(Component, props) {
  const document = dom.document.implementation.createHTMLDocument()
  document.body.innerHTML = renderToStaticMarkup(createElement(Component, props))
  return document.body
}
const renderVisual = (value) => render(LessonVisual, { visual: value })

test('diagram renders only explicit directed links with readable labels, details, and a named figure', () => {
  const body = renderVisual(visual)
  assert.equal(body.querySelectorAll('.lesson-diagram-node').length, 2)
  assert.equal(body.querySelectorAll('.lesson-visual-link').length, 1)
  assert.match(body.querySelector('.lesson-visual-relationships').textContent, /State.*Render.*An update requests a render/)
  for (const item of data) { assert.ok(body.textContent.includes(item.label)); assert.ok(body.textContent.includes(item.detail)) }
  const figure = body.querySelector('figure')
  assert.equal(body.querySelector('figcaption').id, figure.getAttribute('aria-labelledby'))
  assert.equal(body.querySelector('svg').getAttribute('aria-hidden'), 'true')
  assert.equal(renderVisual({ ...visual, links: undefined }).querySelector('.lesson-visual-link'), null, 'Legacy data does not imply a chain')
})

test('process preserves teaching order in an ordered list and uses no invented graph connections', () => {
  const body = renderVisual({ ...visual, type: 'process', links: undefined })
  assert.deepEqual([...body.querySelectorAll('.lesson-process-steps > li strong')].map((node) => node.textContent), ['State', 'Render'])
  assert.equal(body.querySelector('.lesson-process-steps').tagName, 'OL')
  assert.equal(body.querySelector('.lesson-visual-relationships'), null)
  const long = renderVisual({ ...visual, type: 'process', links: undefined, data: Array(6).fill(data[0]) })
  assert.ok(long.querySelector('.lesson-process-steps-long'))
})

test('comparison uses distinct concept areas with complete text rather than a table', () => {
  const body = renderVisual({ ...visual, type: 'comparison', links: undefined })
  assert.equal(body.querySelectorAll('.lesson-comparison-areas > li').length, 2)
  assert.equal(body.querySelectorAll('.lesson-concept-mark').length, 2)
  assert.equal(body.querySelector('table'), null)
  assert.equal(body.querySelector('.lesson-visual-link'), null)
})

test('concept illustrations use explicit native symbols and text equivalents without guessing from keywords', () => {
  const body = renderVisual(plant)
  assert.equal(body.querySelectorAll('.lesson-visual-object').length, 3)
  assert.ok(body.querySelector('.lesson-object-plant'))
  assert.ok(body.querySelector('.lesson-object-sun'))
  assert.ok(body.querySelector('.lesson-object-water'))
  assert.match(body.querySelector('.lesson-visual-relationships').textContent, /Supplies light energy/)
  assert.equal(body.querySelector('img, canvas, image, foreignObject'), null)
  const unspecified = renderVisual({ ...plant, links: undefined, data: [{ label: 'Plant', detail: 'A teaching concept.', symbol: 'unknown' }] })
  assert.equal(unspecified.querySelector('.lesson-object-plant, .lesson-visual-link'), null)
  assert.match(unspecified.textContent, /A teaching concept/)
})

test('none, generated images, missing and malformed metadata render nothing and reserve no panel', () => {
  for (const value of [undefined, null, {}, 'diagram', { type: 'none' }, { ...visual, type: 'generated_image' },
    { ...visual, type: 'svg' }, { ...visual, purpose: '' }, { ...visual, data: [] }, { ...visual, data: [null] },
    { ...visual, data: new Array(2) }, { ...visual, data: Array(7).fill(data[0]) }, { ...visual, links: [{ from: 0, to: 9, label: 'bad' }] }]) {
    assert.equal(renderVisual(value).innerHTML, '')
    assert.equal(nativeLessonVisual(value), null)
  }
})

test('visual metadata is bounded and cannot introduce executable markup, remote assets, or malformed edges', () => {
  for (const links of [null, {}, [null], new Array(1), Array(9).fill(visual.links[0]),
    [{ from: '0', to: 1, label: 'bad' }], [{ from: -1, to: 1, label: 'bad' }], [{ from: 0, to: 0, label: 'bad' }], [{ from: 0, to: 1, label: '' }]]) {
    assert.equal(normalizeLessonVisual({ ...visual, links }), null)
  }
  const dirty = { ...plant, url: 'https://example.com/remote.png', script: 'alert(1)', data: [{ label: '<img src=x onerror=alert(1)>', detail: '<script>alert(1)</script>', symbol: 'javascript:alert(1)' }], links: undefined }
  const normalized = normalizeLessonVisual(dirty)
  assert.equal(normalized.url, undefined)
  assert.equal(normalized.script, undefined)
  assert.equal(normalized.data[0].symbol, undefined)
  const body = renderVisual(dirty)
  assert.equal(body.querySelector('img, script, a, image, foreignObject'), null)
  assert.ok(body.textContent.includes('<script>'))
  assert.equal(normalizeLessonVisual({ ...visual, links: [{ from: 0, to: 1, label: 'x'.repeat(200) }] }).links[0].label.length, 120)
})

test('multiple visual instances have independent SVG references and accessible captions', () => {
  const body = render('div', { children: [createElement(LessonVisual, { key: 1, visual }), createElement(LessonVisual, { key: 2, visual: plant })] })
  const ids = [...body.querySelectorAll('[id]')].map((node) => node.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const path of body.querySelectorAll('[marker-end]')) {
    const markerId = path.getAttribute('marker-end').slice(5, -1)
    assert.ok(ids.includes(markerId))
  }
})

test('StudySession places context and path before the lesson, visuals before tools, and guidance last', () => {
  const learningPath = acceptPathLesson({ ...lesson, nextLessons: [{ topic: 'Events', concept: 'Responding to a click' }] }, undefined, undefined, learningPathContextKey(course))
  const body = render(StudySession, { course, mastery: 40, initialThread: { resume: { lesson: { ...lesson, visual }, learningPath } } })
  assert.match(body.querySelector('.study-subject').textContent, /ReactLesson 1/)
  assert.ok(body.querySelector('.study-session-illustrated'))
  assert.equal(body.querySelector('.study-path').parentElement.className, 'study-context')
  assert.equal(body.querySelector('.study-path').open, false)
  assert.equal(body.querySelector('.study-tools').open, false)
  assert.ok(body.querySelector('.study-lesson-composition > .study-content'))
  assert.ok(body.querySelector('.study-lesson-composition > figure'))
  const html = body.innerHTML
  assert.ok(html.indexOf('study-subject') < html.indexOf('study-path'))
  assert.ok(html.indexOf('study-path') < html.indexOf('<h1>'))
  assert.ok(html.indexOf('</figure>') < html.indexOf('class="study-tools"'))
  assert.ok(html.indexOf('class="study-tools"') < html.indexOf('study-recommendation'))
  assert.equal(body.querySelectorAll('.study-primary-action').length, 1)
  assert.equal(body.querySelector('.study-primary-action').textContent, recommendStudyAction({ lesson }).label)
  assert.equal(body.querySelector('.study-mastery').textContent, 'Mastery · 40%')
  assert.match(body.querySelector('.study-path-next').textContent, /Responding to a click/)
})

test('lessons without usable visuals preserve content, tools, and recommendation without illustrated layout', () => {
  for (const value of [undefined, { type: 'none' }, { ...visual, type: 'generated_image' }, { ...visual, data: [] }]) {
    const body = render(StudySession, { course, mastery: 40, initialThread: { resume: { lesson: { ...lesson, visual: value } } } })
    assert.equal(body.querySelector('.lesson-visual, .study-session-illustrated'), null)
    assert.ok(body.textContent.includes(lesson.content))
    assert.equal(body.querySelectorAll('.study-lesson-actions button').length, 5)
    assert.equal(body.querySelector('.study-primary-action').textContent, 'Give me an example')
  }
  assert.equal(render(StudyPath, {}).innerHTML, '')
})

test('optional symbols and relationships survive the existing API and resume projection', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ...lesson, visual: plant }) }] }] }) }))
  const res = { status(code) { this.code = code; return this }, json(body) { this.body = body; return this } }
  await handler({ method: 'POST', body: { courseName: 'React', mastery: 40 } }, res)
  assert.equal(res.code, 200)
  assert.deepEqual(res.body.visual, plant)
  assert.deepEqual(compactThreadResume({ lesson: res.body }).lesson.visual, plant)
})
