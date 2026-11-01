import { useId, useRef, useState } from 'react'
import { isSupportedMaterial, MATERIAL_ACCEPT, MATERIAL_FORMAT_LABEL, MAX_COURSE_MATERIALS, materialMetadata, normalizeCourseMaterials, sameMaterial } from '../services/courseMaterials'

export default function AddCourseFile({ files, onAddFile }) {
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState([])
    const input = useRef(null)
    const busy = useRef(false)
    const id = useId()
    const materials = normalizeCourseMaterials(files)

    async function handleFileChange(event) {
        const selected = Array.from(event.target.files || [])
        event.target.value = ''
        if (!selected.length || busy.current) return
        if (selected.length > MAX_COURSE_MATERIALS) {
            setErrors([`Choose up to ${MAX_COURSE_MATERIALS} materials at a time.`])
            return
        }
        busy.current = true
        setLoading(true)
        setErrors([])
        const retained = [...materials]
        const failures = []
        let added = 0, duplicates = 0
        for (const [index, file] of selected.entries()) {
            const metadata = materialMetadata(file)
            if (!isSupportedMaterial(file)) { failures.push(`${file.name}: choose a ${MATERIAL_FORMAT_LABEL} file.`); continue }
            if (retained.some(item => sameMaterial(item, metadata))) { duplicates++; continue }
            if (retained.length >= MAX_COURSE_MATERIALS) { failures.push(`This space can keep up to ${MAX_COURSE_MATERIALS} materials.`); break }
            setStatus(`Reading ${file.name} (${index + 1} of ${selected.length})…`)
            try {
                await onAddFile(file)
                retained.push(metadata)
                added++
            } catch {
                failures.push(`${file.name} couldn’t be added. Choose it again to retry.`)
            }
        }
        setStatus([added ? `${added} ${added === 1 ? 'material added' : 'materials added'}. Your topics and dates are ready to review.` : '',
            duplicates ? `${duplicates} ${duplicates === 1 ? 'material is' : 'materials are'} already added.` : ''].filter(Boolean).join(' '))
        setErrors(failures)
        setLoading(false)
        busy.current = false
    }

    return <section className="orbit-upload course-materials" aria-busy={loading} aria-labelledby={`${id}-heading`}>
        <h2 id={`${id}-heading`}>Course materials</h2>
        {materials.length > 0 ? <ul className="course-material-list" aria-label="Added course materials">{materials.map(file => <li key={JSON.stringify([file.name, file.size, file.lastModified])}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" /></svg>
            <div><span>{file.name}</span><small>Added{file.addedAt && <> · <time dateTime={file.addedAt}>{new Date(file.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></>}</small></div>
        </li>)}</ul> : <p className="orbit-muted">Add a syllabus, notes, or a study guide to find useful topics and dates.</p>}
        <p className="course-material-formats" id={`${id}-formats`}>{MATERIAL_FORMAT_LABEL} files · You can choose more than one.</p>
        <input ref={input} type="file" hidden aria-label="Choose course materials" accept={MATERIAL_ACCEPT} multiple disabled={loading} onChange={handleFileChange} />
        <button className="orbit-button" type="button" aria-describedby={`${id}-formats`} disabled={loading || materials.length >= MAX_COURSE_MATERIALS} onClick={() => input.current?.click()}>{loading ? 'Reading material…' : '+ Add material'}</button>
        <p className="course-material-status" role="status">{status}</p>
        {errors.length > 0 && <ul className="course-material-errors" role="alert">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
    </section>
}
