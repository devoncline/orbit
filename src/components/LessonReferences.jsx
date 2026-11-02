import { useId, useRef, useState } from 'react'
import { MATERIAL_ACCEPT, PHOTO_ACCEPT, materialType, normalizeCourseMaterials } from '../services/courseMaterials'
import { MAX_LESSON_REFERENCES, materialReferenceKey, readLessonReference, resolveLessonReferences } from '../services/lessonReferences'

export default function LessonReferences({ references, files, getMaterialFile, onChange, onReadingChange, onIntent, disabled, temporaryWork }) {
  const [expanded, setExpanded] = useState(false)
  const [reading, setReading] = useState(false)
  const [errors, setErrors] = useState([])
  const [status, setStatus] = useState('')
  const [offerNext, setOfferNext] = useState(false)
  const lock = useRef(false)
  const input = useRef(null)
  const camera = useRef(null)
  const trigger = useRef(null)
  const id = useId()
  const attached = resolveLessonReferences(references, files)
  const materials = normalizeCourseMaterials(files).filter(file => materialType(file))
  const unavailable = references.length - attached.length
  const busy = disabled || reading

  async function addFiles(event) {
    const selected = Array.from(event.target.files || []).slice(0, MAX_LESSON_REFERENCES + 1)
    event.target.value = ''
    if (lock.current || disabled || !selected.length) return
    lock.current = true
    setReading(true)
    onReadingChange?.(true)
    setErrors([])
    const next = [...references], failures = []
    let count = 0
    for (const file of selected) {
      if (next.some(item => item.id === `upload:${materialReferenceKey(file)}`)) continue
      if (next.length >= MAX_LESSON_REFERENCES) { failures.push('Keep up to four references in this lesson. Remove one to add another.'); break }
      try {
        const reference = await readLessonReference(file, next.reduce((sum, item) => sum + (item.size || 0), 0))
        next.push(reference)
        count++
      } catch (error) { failures.push(`${file.name}: ${error.message}`) }
    }
    if (count) { onChange(next); setOfferNext(true) }
    setErrors(failures)
    setStatus(count ? `${count} ${count === 1 ? 'reference added' : 'references added'}. Choose a learning action when ready.` : '')
    setReading(false)
    onReadingChange?.(false)
    lock.current = false
  }

  async function selectMaterial(material) {
    if (lock.current || disabled || references.length >= MAX_LESSON_REFERENCES) return
    const materialKey = materialReferenceKey(material)
    if (references.some(item => item.materialKey === materialKey)) return
    lock.current = true
    setReading(true)
    onReadingChange?.(true)
    setErrors([])
    const reference = { id: `course:${materialKey}`, source: 'course', materialKey }
    const file = getMaterialFile?.(material)
    if (file) {
      try {
        const { data, size } = await readLessonReference(file, attached.reduce((sum, item) => sum + (item.size || 0), 0))
        Object.assign(reference, { data, size })
      } catch (error) {
        setErrors([`${material.name}: ${error.message} ${material.summary ? 'Using its saved summary instead.' : 'Choose a smaller original page to share its content.'}`])
      }
    }
    onChange([...references, reference])
    setStatus('Course material linked to this lesson. The original stays in your course.')
    setOfferNext(true)
    setReading(false)
    onReadingChange?.(false)
    lock.current = false
  }

  return <section className="lesson-references" aria-label="Lesson references" aria-busy={reading}>
    <button type="button" className="study-secondary-action" ref={trigger} aria-expanded={expanded} aria-controls={id} disabled={busy}
      onClick={() => setExpanded(!expanded)}>Add reference</button>
    {attached.length > 0 && <ul className="lesson-reference-list" aria-label="Attached lesson references">{attached.map(reference => <li key={reference.id}>
      <div><span>{reference.name}</span><small>{materialType(reference)?.label} · {reference.source === 'course' ? 'Course material' : 'Temporary'}
        {reference.data ? '' : reference.summary ? ' · Saved summary only; attach the original for specific questions.' : ' · Original unavailable; attach the file to read this page.'}</small></div>
      <button type="button" disabled={busy} aria-label={`Remove reference ${reference.name}`} onClick={() => {
        onChange(references.filter(item => item.id !== reference.id)); setStatus('Reference removed from this lesson.'); setErrors([]); trigger.current?.focus()
      }}>Remove</button>
    </li>)}</ul>}
    {unavailable > 0 && <p>A linked course material is no longer available. <button type="button" disabled={busy} onClick={() => onChange(references.filter(item => attached.some(value => value.id === item.id)))}>Clear unavailable references</button></p>}
    {expanded && <div id={id} className="lesson-reference-picker">
      <p>Bring a page into this lesson. Files stay temporary; they are not added to course materials.</p>
      <p id={`${id}-limits`}>PDF, JPG/JPEG, PNG or WebP · Up to four references, 3 MB combined. Export HEIC/HEIF as JPG first.</p>
      <input ref={input} hidden type="file" multiple accept={MATERIAL_ACCEPT} aria-label="Choose lesson references" aria-describedby={`${id}-limits`} disabled={busy} onChange={addFiles} />
      <input ref={camera} hidden type="file" accept={PHOTO_ACCEPT} capture="environment" aria-label="Take a lesson reference photo" disabled={busy} onChange={addFiles} />
      <div className="lesson-reference-actions"><button type="button" disabled={busy} onClick={() => input.current?.click()}>Upload file or photo</button><button type="button" disabled={busy} onClick={() => camera.current?.click()}>Take photo</button></div>
      {materials.length > 0 && <label className="lesson-reference-course">Use course material
        <select value="" disabled={busy || references.length >= MAX_LESSON_REFERENCES} onChange={event => { const material = materials.find(file => materialReferenceKey(file) === event.target.value); if (material) selectMaterial(material) }}>
          <option value="">Choose a material</option>{materials.map(material => <option key={materialReferenceKey(material)} value={materialReferenceKey(material)} disabled={references.some(item => item.materialKey === materialReferenceKey(material))}>{material.name}</option>)}
        </select>
      </label>}
      <p>Added files are sent to Orbit’s AI only when you choose a teaching action or send a message. References and work using them last for this visit, until you continue to the next lesson. Refresh returns to your saved lesson.</p>
    </div>}
    {temporaryWork && !expanded && <p className="lesson-reference-note">Reference work is temporary. Refresh returns to your saved lesson; continuing clears these references.</p>}
    {reading && <p role="status">Reading your reference…</p>}
    {!reading && status && <p role="status">{status}</p>}
    {errors.length > 0 && <ul role="alert" className="lesson-reference-errors">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
    {offerNext && attached.length > 0 && <div className="lesson-reference-actions" aria-label="Work with lesson references">
      {['Understand it', 'Work through it', 'Check my work', 'Quiz me'].map(intent => <button type="button" key={intent} disabled={busy} onClick={() => { setOfferNext(false); setExpanded(false); onIntent(intent) }}>{intent}</button>)}
    </div>}
  </section>
}
