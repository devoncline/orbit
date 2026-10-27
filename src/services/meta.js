export async function analyzeCourseFile(file) {
    const base64File = await fileToBase64(file)

    const response = await fetch('/api/analyze-course', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: base64File,
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to analyze course file')
    }

    return response.json()
}

export function generateStudyLesson(course, mastery) {
    return requestStudyLesson(course, mastery, 'lesson')
}

export function explainStudyLessonDifferently(course, lesson, example = '') {
    return requestStudyLesson(course, course.mastery?.overall ?? 40, 'simplify', lesson, example)
}

export function generateStudyExample(course, lesson, example = '') {
    return requestStudyLesson(course, course.mastery?.overall ?? 40, 'example', lesson, example)
}

async function requestStudyLesson(course, mastery, action, lesson, example) {
    const response = await fetch('/api/generate-study-lesson', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            courseName: course.name,
            nextTask: course.nextTask,
            importantTopics: course.importantTopics,
            upcomingWork: course.upcomingWork,
            mastery,
            topicMastery: course.mastery?.topics || {},
            action,
            lesson,
            example,
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to generate study lesson')
    }

    return response.json()
}

export async function generateStudyQuestion(course, mastery, lesson) {
    const response = await fetch('/api/generate-study-question', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            courseName: course.name,
            nextTask: course.nextTask,
            importantTopics: course.importantTopics,
            upcomingWork: course.upcomingWork,
            mastery: mastery,
            topicMastery: course.mastery?.topics || {},
            ...(lesson ? { lesson } : {}),
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to generate study question')
    }

    return response.json()
}

export async function evaluateStudyAnswer(
    course,
    studyQuestion,
    selectedAnswer,
    mastery
) {
    const correctAnswer = studyQuestion.answers.find(
        (answer) => answer.correct
    )

    const response = await fetch('/api/evaluate-study-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            courseName: course.name,
            question: studyQuestion.question,
            selectedAnswer: selectedAnswer.text,
            correctAnswer: correctAnswer.text,
            importantTopics: course.importantTopics,
            mastery: mastery,
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to evaluate study answer')
    }

    return response.json()
}

export async function recommendCourse(courses) {
    const response = await fetch('/api/recommend-course', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            courses: courses,
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to recommend course')
    }

    return response.json()
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => {
            resolve(reader.result)
        }

        reader.onerror = reject

        reader.readAsDataURL(file)
    })
}
