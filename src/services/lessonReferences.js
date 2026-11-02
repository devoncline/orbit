import { materialType, materialValidationError, normalizeCourseMaterials, readMaterialData } from './courseMaterials.js'

export const MAX_LESSON_REFERENCES = 4
// Leaves room for base64 expansion and lesson context in the existing API body.
export const MAX_REFERENCE_BYTES = 3 * 1024 * 1024
const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
export const materialReferenceKey = file => JSON.stringify([file.name, file.type, file.size, file.lastModified])

export function referenceValidationError(file, usedBytes = 0) {
  const error = materialValidationError(file)
  if (error) return error
  if (file.size > MAX_REFERENCE_BYTES) return 'Choose a file up to 3 MB for this lesson.'
  if (usedBytes + file.size > MAX_REFERENCE_BYTES) return 'Lesson references can total up to 3 MB. Remove a reference or choose a smaller file.'
  return ''
}

// Shared client/server allowlist; no URLs, arbitrary objects, or unsupported bytes.
export function normalizeLessonReferences(value) {
  let usedBytes = 0
  const result = []
  for (const item of (Array.isArray(value) ? value : []).slice(0, MAX_LESSON_REFERENCES)) {
    const name = text(item?.name, 200)
    const type = materialType({ name, type: item?.type })?.type
    if (!name || !type || !['upload', 'course'].includes(item?.source)) continue
    const reference = { name, type, source: item.source }
    if (item.data !== undefined) {
      if (typeof item.data !== 'string' || item.data.length > Math.ceil(MAX_REFERENCE_BYTES / 3) * 4 + 50) continue
      const prefix = `data:${type};base64,`
      if (!item.data.startsWith(prefix)) continue
      const encoded = item.data.slice(prefix.length)
      if (!encoded.length || encoded.length % 4 || /[^A-Za-z0-9+/=]/.test(encoded) || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) continue
      const size = encoded.length / 4 * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)
      if (usedBytes + size > MAX_REFERENCE_BYTES) continue
      // Check magic bytes before accepting a claimed MIME type. Full decoding stays with Muse.
      const header = atob(encoded.slice(0, 24))
      const valid = type === 'application/pdf' ? header.startsWith('%PDF-')
        : type === 'image/png' ? header.startsWith('\x89PNG\r\n\x1a\n')
          : type === 'image/jpeg' ? header.startsWith('\xff\xd8\xff')
            : header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP'
      if (!valid) continue
      reference.data = item.data
      reference.size = size
      usedBytes += size
    } else if (item.source === 'upload') continue
    if (item.source === 'course' && text(item.summary, 1600)) reference.summary = text(item.summary, 1600)
    result.push(reference)
  }
  return result
}

export async function readLessonReference(file, usedBytes = 0) {
  const error = referenceValidationError(file, usedBytes)
  if (error) throw new Error(error)
  const data = await readMaterialData(file)
  const reference = normalizeLessonReferences([{ name: file.name, type: materialType(file).type, source: 'upload', data }])[0]
  if (!reference || reference.size !== file.size) throw new Error('This file is not a readable PDF, JPG, PNG or WebP. Try exporting it again.')
  return { ...reference, id: `upload:${materialReferenceKey(file)}` }
}

// Course entries are pointers; resolve current metadata without duplicating/removing materials.
export function resolveLessonReferences(references, files) {
  const materials = normalizeCourseMaterials(files)
  return references.flatMap(reference => {
    if (reference.source !== 'course') return [reference]
    const material = materials.find(file => materialReferenceKey(file) === reference.materialKey)
    return material ? [{ id: reference.id, source: 'course', name: material.name, type: materialType(material)?.type,
      ...(reference.data ? { data: reference.data, size: reference.size } : {}),
      ...(material.summary ? { summary: material.summary } : {}) }] : []
  })
}

export function lessonReferenceRequest(references) {
  const normalized = normalizeLessonReferences(references)
  return normalized.length ? { lessonReferences: normalized } : {}
}
