import { useSyncExternalStore } from 'react'
import { EMPTY_IMAGE } from '../services/lessonImages'
import { selectStudyPresentation, studyPresentationImageKey } from '../services/studyPresentation'

// Subscribe to the existing image cache; presentation never generates, retries,
// persists, invalidates, or cancels images.
export default function useStudyPresentation(state, imageCache) {
  const key = studyPresentationImageKey(state)
  const image = useSyncExternalStore(imageCache.subscribe, () => imageCache.get(key), () => EMPTY_IMAGE)
  return selectStudyPresentation(state, image.status)
}
