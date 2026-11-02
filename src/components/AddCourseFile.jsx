import { useId, useRef, useState } from 'react'
import { aiErrorMessage } from '../services/demoUsage'
import { canAnalyzeMaterial, materialType, materialValidationError, MATERIAL_ACCEPT, PHOTO_ACCEPT, MATERIAL_FORMAT_LABEL, MAX_COURSE_MATERIALS, materialMetadata, normalizeCourseMaterials, sameMaterial } from '../services/courseMaterials'

export default function AddCourseFile({ files, onAddFile, onAnalyzeFile, onRemoveFile, hasFile }) {
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState([])
    const [kind, setKind] = useState('resource')
    const input = useRef(null)
    const camera = useRef(null)
    const busy = useRef(false)
    const id = useId()
    const materials = normalizeCourseMaterials(files)

    async function handleFileChange(event) {
        const selected = Array.from(event.target.files || [])
        event.target.value = ''
        if (!selected.length || busy.current) return
        if (selected.length > MAX_COURSE_MATERIALS) {
            setErrors(['Choose up to ' + MAX_COURSE_MATERIALS + ' materials at a time.'])
            return
        }
        busy.current = true
        setLoading(true)
        setErrors([])
        const retained = [...materials], failures = []
        let added = 0, duplicates = 0
        for (const file of selected) {
            const validation = materialValidationError(file)
            if (validation) { failures.push(file.name + ': ' + validation); continue }
            const metadata = materialMetadata(file)
            const existing = retained.find(item => sameMaterial(item, metadata))
            if (!existing && retained.length >= MAX_COURSE_MATERIALS) { failures.push('This space can keep up to ' + MAX_COURSE_MATERIALS + ' materials.'); break }
            try {
                await onAddFile(file, existing?.kind || kind)
                if (existing) duplicates++
                else { retained.push(metadata); added++ }
            } catch {
                failures.push(file.name + " couldn't be added. Choose it again to retry.")
            }
        }
        setStatus([added ? `${added} ${added === 1 ? 'material added' : 'materials added'}. Nothing has been sent to AI.` : '',
            duplicates ? duplicates + ' already added; selected PDFs are available to read again.' : ''].filter(Boolean).join(' '))
        setErrors(failures)
        setLoading(false)
        busy.current = false
    }

    async function analyze(file) {
        if (busy.current) return
        busy.current = true
        setLoading(true)
        setErrors([])
        setStatus('Reading ' + file.name + '…')
        try {
            await onAnalyzeFile(file)
            setStatus(file.kind === 'syllabus' ? 'Syllabus topics and dates are ready to review.' : 'Class material is ready to use in your lessons. No calendar dates were added.')
        } catch (error) {
            setStatus('')
            setErrors([aiErrorMessage(error, file.name + ' could not be read. Your material is still attached; try again.')])
        } finally {
            setLoading(false)
            busy.current = false
        }
    }

    return <section className="orbit-upload course-materials" aria-busy={loading} aria-labelledby={id + '-heading'}>
        <h2 id={id + '-heading'}>Course materials</h2>
        {materials.length > 0 ? <ul className="course-material-list" aria-label="Added course materials">{materials.map(file => <li key={JSON.stringify([file.name, file.size, file.lastModified])}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" /></svg>
            <div><span>{file.name}</span><small>{materialType(file)?.label || file.type || 'File'} · {file.kind === 'resource' ? 'Class material' : 'Syllabus'} · Added{file.addedAt && <> · <time dateTime={file.addedAt}>{new Date(file.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time></>}</small>
                {!canAnalyzeMaterial(file) ? <small>Photo saved by name only. To read it, use Add reference in Study. After refresh, choose the original photo again.</small>
                    : file.analyzed || !file.kind ? <><small>Ready for learning.</small>{file.summary && <details><summary>Learning context</summary><p>{file.summary}</p></details>}</>
                        : <><small>{hasFile?.(file) ? 'Ready to read when you choose.' : 'Choose this file again to read it. Original files are not saved after refresh.'}</small>
                            <button className="orbit-text-button" type="button" aria-label={(file.kind === 'syllabus' ? 'Read syllabus & find dates: ' : 'Use PDF for learning: ') + file.name} disabled={loading || !hasFile?.(file)} onClick={() => analyze(file)}>{file.kind === 'syllabus' ? 'Read syllabus & find dates' : 'Use PDF for learning'}</button></>}
                {onRemoveFile && <button className="orbit-text-button" type="button" disabled={loading} aria-label={'Remove ' + file.name} onClick={() => { onRemoveFile(file); setStatus('Material removed. Previously imported syllabus topics and dates are kept.'); setErrors([]) }}>Remove</button>}
            </div>
        </li>)}</ul> : <p className="orbit-muted">Add a syllabus, worksheet, notes, or a photo from class.</p>}
        <div className="orbit-form course-material-controls">
            <label htmlFor={id + '-kind'}>What are you adding?</label>
            <select id={id + '-kind'} value={kind} disabled={loading} onChange={event => setKind(event.target.value)}>
                <option value="resource">Class material / resource</option><option value="syllabus">Syllabus / course outline</option>
            </select>
        </div>
        <p className="course-material-formats" id={id + '-formats'}>{MATERIAL_FORMAT_LABEL} · Choose more than one. PDFs up to 3 MB; photos up to 20 MB. For HEIC/HEIF, export as JPG first.</p>
        <input ref={input} type="file" hidden aria-label="Choose course materials" accept={MATERIAL_ACCEPT} multiple disabled={loading} onChange={handleFileChange} />
        <input ref={camera} type="file" hidden aria-label="Take a photo of class material" accept={PHOTO_ACCEPT} capture="environment" disabled={loading} onChange={handleFileChange} />
        <div className="course-material-actions">
            <button className="orbit-button" type="button" aria-describedby={id + '-formats'} disabled={loading} onClick={() => input.current?.click()}>{materials.length ? 'Add another file' : 'Add class material'} · Photos or files</button>
            <button className="orbit-text-button" type="button" disabled={loading} onClick={() => camera.current?.click()}>Take a photo</button>
        </div>
        <p className="course-material-formats">A PDF reading action sends that PDF to Orbit’s AI. Only names and extracted context are saved. Photos are not analyzed or saved as image files. Removing a syllabus keeps its imported topics and dates.</p>
        <p className="course-material-status" role="status">{status}</p>
        {errors.length > 0 && <ul className="course-material-errors" role="alert">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
    </section>
}
