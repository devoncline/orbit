import { useState } from 'react'

export default function AddCourseFile({ onAddFile }) {
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleFileChange(event) {
        const file = event.target.files[0]
        const input = event.target
        if (file) {
            setLoading(true)
            setError('')
            setStatus('Orbit is reading your material…')
            try {
                await onAddFile(file)
                setStatus('Material added. Your next step and any dates are ready to review.')
            } catch {
                setStatus('')
                setError('That PDF couldn’t be added. Choose it again to retry.')
            } finally {
                setLoading(false)
                input.value = ''
            }
        }
    }

    return (
        <section className="orbit-upload" aria-busy={loading}>
            <h3>Bring your material</h3>
            <p className="orbit-muted">Add a syllabus, notes, or a study guide as a PDF.</p>

            <input
                type="file"
                aria-label="Learning material PDF"
                accept="application/pdf"
                disabled={loading}
                onChange={handleFileChange}
            />
            <p role="status">{status}</p>
            {error && <p role="alert">{error}</p>}
        </section>
    )
}
