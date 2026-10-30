import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import { lessonImageRequest } from '../services/lessonImageRequest'
import { EMPTY_IMAGE } from '../services/lessonImages'
import './LessonVisual.css'

function ImageContent({ url, alt, onError }) {
  const [loaded, setLoaded] = useState(false)
  return <>
    {!loaded && <p className="lesson-image-status" role="status">Loading lesson image…</p>}
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
        ? <ImageContent key={image.url} url={image.url} alt={`${visual.purpose} ${visual.data.map((item) => `${item.label}: ${item.detail}`).join(' ')}`}
          onError={() => cache.fail(requestKey)} />
        : <p className="lesson-image-status" role="status">Preparing a lesson image…</p>}
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
