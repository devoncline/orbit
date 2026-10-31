import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import { lessonImageRequest } from '../services/lessonImageRequest'
import { EMPTY_IMAGE } from '../services/lessonImages'
import './LessonVisual.css'

function ImageLoading({ decoding = false }) {
  return <div className="lesson-image-loading" role="status">
    <svg className="lesson-image-orbit" viewBox="0 0 240 120" fill="none" aria-hidden="true">
      <ellipse cx="120" cy="60" rx="91" ry="32" transform="rotate(-18 120 60)" />
      <ellipse cx="120" cy="60" rx="64" ry="23" transform="rotate(24 120 60)" />
      <circle className="lesson-image-core" cx="120" cy="60" r="7" />
      <g className="lesson-image-stars"><circle cx="35" cy="85" r="3" /><circle cx="196" cy="25" r="2" /><circle cx="79" cy="23" r="1.5" /><circle cx="176" cy="94" r="1.5" /></g>
    </svg>
    <span>{decoding ? 'Loading lesson image…' : 'Preparing a lesson image…'}</span>
  </div>
}

function ImageContent({ url, alt, onError }) {
  const [loaded, setLoaded] = useState(false)
  return <>
    {!loaded && <ImageLoading decoding />}
    <img className="lesson-generated-image" src={url} alt={alt} hidden={!loaded}
      referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={onError} />
  </>
}

function GeneratedLessonImage({ requestKey, cache, active }) {
  const id = useId()
  const image = useSyncExternalStore(cache.subscribe, () => cache.get(requestKey), () => EMPTY_IMAGE)
  const { visual } = JSON.parse(requestKey)
  useEffect(() => {
    if (active) cache.load(requestKey)
  }, [cache, requestKey, active])

  if (image.status === 'error') return <div className="lesson-image-retry">
    <span>Visual unavailable.</span> <button type="button" onClick={() => cache.load(requestKey, true)}>Retry visual</button>
  </div>

  return <figure className="lesson-visual lesson-visual-generated_image" aria-labelledby={`${id}-caption`}>
    <figcaption id={`${id}-caption`}>
      <span className="lesson-visual-eyebrow">Explore the idea</span>
      <span className="lesson-visual-purpose">{visual.purpose}</span>
    </figcaption>
    <div className="lesson-image-surface">
      {image.status === 'ready'
        ? <ImageContent key={image.url} url={image.url} alt={`${visual.purpose} ${visual.data.map((item) => item.label).join(', ')}.`}
          onError={() => cache.fail(requestKey)} />
        : <ImageLoading />}
    </div>
  </figure>
}

export default function LessonVisual({ visual, lesson, courseName, cache, active = true }) {
  const request = lessonImageRequest({ visual, lesson, courseName })
  if (!request || !cache) return null
  const requestKey = JSON.stringify(request)
  // Keying also resets image decode state immediately when teaching context changes.
  return <GeneratedLessonImage key={requestKey} requestKey={requestKey} cache={cache} active={active} />
}
