export default function CourseDetails({ course }) {
  return (
    <section>
      <h2>{course.name}</h2>

      <h3>Syllabus</h3>
      <p>Course: {course.syllabus.courseName}</p>
      <p>Instructor: {course.syllabus.instructor}</p>
      <p>Semester: {course.syllabus.semester}</p>

      <h3>Course Files</h3>

      {course.files.map((file) => (
        <div key={file.name}>
          <p>{file.name}</p>
          <p>{file.type}</p>
        </div>
      ))}
    </section>
  )
}