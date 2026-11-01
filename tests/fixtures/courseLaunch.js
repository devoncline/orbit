export const launchDate = '2026-11-01'
export const biologyAnalysis = {
  courseName: 'Biology 101', instructor: 'Professor Example', semester: 'Fall 2026',
  importantTopics: ['Photosynthesis', 'Cellular Respiration', 'Genetics'],
  syllabusItems: [
    { topic: 'Photosynthesis', unit: 'Unit 3', startDate: '2026-11-02', endDate: '2026-11-06' },
    { topic: 'Cellular Respiration', unit: 'Unit 4', startDate: '2026-11-09' },
    { topic: 'Genetics', unit: 'Unit 5', dateText: 'Later in the term' },
  ],
  upcomingWork: [
    { title: 'Photosynthesis Reading Check', type: 'reading', topic: 'Photosynthesis', date: '2026-11-04' },
    { title: 'Photosynthesis Quiz', type: 'quiz', topic: 'Photosynthesis', date: '2026-11-05' },
    { title: 'Respiration Practice', type: 'practice', topic: 'Cellular Respiration', date: '2026-11-12' },
  ],
  nextRecommendedAction: 'Focus on Photosynthesis to prepare for the reading check and quiz: review inputs, outputs, and stored energy.',
}
export const biologyCourse = {
  name: 'Biology 101', type: 'class', ...biologyAnalysis, nextTask: biologyAnalysis.nextRecommendedAction,
  mastery: { overall: 40, topics: {} }, files: [{ name: 'BIO101_Syllabus.pdf', type: 'application/pdf', size: 5 }],
}
