// One capability list for the picker, client and analysis endpoint. Other media
// can be added here when the analysis service supports them.
export const MATERIAL_TYPES = [{ type: 'application/pdf', extension: '.pdf', label: 'PDF' }]
export const MATERIAL_ACCEPT = MATERIAL_TYPES.flatMap(item => [item.type, item.extension]).join(',')
export const MATERIAL_FORMAT_LABEL = MATERIAL_TYPES.map(item => item.label).join(', ')
export const MAX_COURSE_MATERIALS = 100
const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : ''

export function isSupportedMaterial(file) {
  return MATERIAL_TYPES.some(item => text(file?.name, 200).toLowerCase().endsWith(item.extension) && (!file.type || file.type === item.type))
}

export function materialMetadata(file, addedAt) {
  return {
    name: text(file?.name, 200), type: text(file?.type, 100), size: Number.isFinite(file?.size) ? Math.max(0, file.size) : 0,
    ...(Number.isFinite(file?.lastModified) ? { lastModified: Math.max(0, file.lastModified) } : {}),
    ...(typeof addedAt === 'string' && Number.isFinite(Date.parse(addedAt)) ? { addedAt: new Date(addedAt).toISOString() } : {}),
  }
}

export function sameMaterial(a, b) {
  return a.name === b.name && a.size === b.size && (!a.type || !b.type || a.type === b.type) &&
    (!Number.isFinite(a.lastModified) || !Number.isFinite(b.lastModified) || a.lastModified === b.lastModified)
}

export function normalizeCourseMaterials(files) {
  const result = []
  for (const file of (Array.isArray(files) ? files : []).slice(0, MAX_COURSE_MATERIALS)) {
    const metadata = materialMetadata(file, file?.addedAt)
    if (metadata.name && !result.some(item => sameMaterial(item, metadata))) result.push(metadata)
  }
  return result
}
