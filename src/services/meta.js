export async function analyzeCourseFile(file) {
  console.log('Orbit will analyze:', file)

  return {
    courseName: 'Biology 101',
    instructor: 'Dr. Carter',
    importantTopics: [
      'Photosynthesis',
      'Cellular respiration',
      'Genetics',
    ],
    upcomingWork: [
      {
        title: 'Photosynthesis Quiz',
        type: 'quiz',
        date: '2026-10-27',
      },
    ],
  }
}