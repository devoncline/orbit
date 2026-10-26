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

export async function generateStudyQuestion(course, mastery) {
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