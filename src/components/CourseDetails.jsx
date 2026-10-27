export default function CourseDetails({ course }) {
  return (
    <section>
      <h2>{course.name}</h2>

      {course.syllabus && (
        <>
          <h3>Syllabus</h3>
          {course.syllabus.courseName && <p>Course: {course.syllabus.courseName}</p>}
          {course.syllabus.instructor && <p>Instructor: {course.syllabus.instructor}</p>}
          {course.syllabus.semester && <p>Semester: {course.syllabus.semester}</p>}
        </>
      )}

      <h3>Learning material</h3>

      {course.files?.length > 0 ? (
        course.files.map((file) => (
          <div key={file.name}>
            <p>{file.name}</p>
            <p>{file.type}</p>
          </div>
        ))
      ) : (
        <p>No material yet. You can start with an idea or add a PDF.</p>
      )}
    </section>
  )
}
