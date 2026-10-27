export default function AddCourseFile({ onAddFile }) {
    function handleFileChange(event) {
        const file = event.target.files[0]

        if (file) {
            onAddFile(file)
        }
    }

    return (
        <section>
            <h3>Add Course Material</h3>

            <input
                type="file"
                aria-label="Course material PDF"
                accept="application/pdf"
                onChange={handleFileChange}
            />
        </section>
    )
}
