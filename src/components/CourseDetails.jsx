export default function CourseDetails({ course }) {
  return (
    <section>
      <h2>{course.name}</h2>

      <h3>Syllabus</h3>

      {course.syllabus ? (
        <>
          <p>Course: {course.syllabus.courseName}</p>
          <p>Instructor: {course.syllabus.instructor}</p>
          <p>Semester: {course.syllabus.semester}</p>
        </>
      ) : (
        <p>No syllabus information yet.</p>
      )}

      <h3>Course Files</h3>

      {course.files?.length > 0 ? (
        course.files.map((file) => (
          <div key={file.name}>
            <p>{file.name}</p>
            <p>{file.type}</p>
          </div>
        ))
      ) : (
        <p>No course files yet.</p>
      )}
    </section>
  )
}