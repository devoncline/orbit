import { retainStudyExchanges } from './studyConversation.js'
import { learningAnchorRequest } from './studyLearningContext.js'

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

export function generateStudyLesson(course, mastery, { anchors = [] } = {}) {
    return requestStudyLesson(course, mastery, 'lesson', undefined, undefined, anchors)
}

export function explainStudyLessonDifferently(course, lesson, example = '', { anchors = [] } = {}) {
    return requestStudyLesson(course, course.mastery?.overall ?? 40, 'simplify', lesson, example, anchors)
}

export function generateStudyExample(course, lesson, example = '', { anchors = [] } = {}) {
    return requestStudyLesson(course, course.mastery?.overall ?? 40, 'example', lesson, example, anchors)
}

async function requestStudyLesson(course, mastery, action, lesson, example, anchors) {
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
            ...learningAnchorRequest(anchors, { topic: lesson?.topic, concept: lesson?.concept, text: lesson?.content || course.nextTask }),
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to generate study lesson')
    }

    return response.json()
}

export async function respondToStudyMessage(
    course,
    lesson,
    { message, history = [], example = '', activityContext, signal, anchors = [] }
) {
    const response = await fetch('/api/respond-to-study-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({
            courseName: course.name,
            nextTask: course.nextTask,
            importantTopics: course.importantTopics,
            upcomingWork: course.upcomingWork,
            mastery: course.mastery?.overall ?? 40,
            topicMastery: course.mastery?.topics || {},
            lesson,
            example,
            history: retainStudyExchanges(history).map((exchange) => ({
                message: exchange.message,
                response: exchange.response,
            })),
            message,
            ...(activityContext ? { activityContext } : {}),
            ...learningAnchorRequest(anchors, { topic: lesson.topic, concept: lesson.concept, text: message }),
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to respond to study message')
    }

    return response.json()
}

export function generateStudyActivity(course, lesson, options = {}) {
    return requestStudyActivity(course, lesson, 'generate', options)
}

export function evaluateStudyActivity(course, lesson, activity, learnerResponse, options = {}) {
    return requestStudyActivity(course, lesson, 'evaluate', { ...options, activity, learnerResponse })
}

async function requestStudyActivity(
    course,
    lesson,
    action,
    { history = [], example = '', activity, learnerResponse, activityContext, signal, anchors = [] }
) {
    const response = await fetch('/api/study-activity', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({
            courseName: course.name,
            nextTask: course.nextTask,
            importantTopics: course.importantTopics,
            upcomingWork: course.upcomingWork,
            mastery: course.mastery?.overall ?? 40,
            topicMastery: course.mastery?.topics || {},
            lesson,
            example,
            history: retainStudyExchanges(history).map((exchange) => ({
                message: exchange.message,
                response: exchange.response,
            })),
            action,
            activity,
            learnerResponse,
            activityContext,
            ...learningAnchorRequest(anchors, { topic: lesson.topic, concept: lesson.concept, text: lesson.content }),
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to process study activity')
    }

    return response.json()
}

export async function generateStudyQuestion(course, mastery, lesson, { anchors = [] } = {}) {
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
            ...learningAnchorRequest(anchors, { topic: lesson?.topic, concept: lesson?.concept, text: lesson?.content || course.nextTask }),
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
    mastery,
    { anchors } = {}
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
            ...(anchors && studyQuestion.topic ? { topic: studyQuestion.topic } : {}),
            ...learningAnchorRequest(anchors, { topic: studyQuestion.topic, text: studyQuestion.question }),
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
