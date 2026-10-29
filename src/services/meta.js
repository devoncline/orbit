import { retainStudyExchanges } from './studyConversation.js'
import { readStudyConversationStream } from './studyConversationStream.js'
import { learningAnchorRequest } from './studyLearningContext.js'
import { coursePositionRequest, inferCoursePosition, localDate } from './coursePosition.js'
import { learningPathContextKey, normalizeLearningPath } from './learningPath.js'

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
            currentDate: localDate(),
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to analyze course file')
    }

    return response.json()
}

export function generateStudyLesson(course, mastery, { anchors = [], path, signal } = {}) {
    return requestStudyLesson(course, mastery, 'lesson', undefined, undefined, anchors, path, signal)
}

export function generateNextStudyLesson(course, mastery, lesson, { anchors = [], path, signal } = {}) {
    const currentPath = normalizeLearningPath(path)
    // Do not present outdated suggestions as the plan after new material or learner evidence.
    if (currentPath.contextKey !== learningPathContextKey(course)) currentPath.upcoming = []
    return requestStudyLesson(course, mastery, 'next', lesson, undefined, anchors, currentPath, signal)
}

export function explainStudyLessonDifferently(course, lesson, example = '', { anchors = [] } = {}) {
    return requestStudyLesson(course, course.mastery?.overall ?? 40, 'simplify', lesson, example, anchors)
}

export function generateStudyExample(course, lesson, example = '', { anchors = [] } = {}) {
    return requestStudyLesson(course, course.mastery?.overall ?? 40, 'example', lesson, example, anchors)
}

async function requestStudyLesson(course, mastery, action, lesson, example, anchors, path, signal) {
    const response = await fetch('/api/generate-study-lesson', {
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
            mastery,
            topicMastery: course.mastery?.topics || {},
            ...coursePositionRequest(course),
            action,
            lesson,
            example,
            ...(path !== undefined ? { learningPath: normalizeLearningPath(path) } : {}),
            ...learningAnchorRequest(anchors, { topic: lesson?.topic || inferCoursePosition(course).currentTopic, concept: lesson?.concept, text: lesson?.content || course.nextTask }),
        }),
    })

    if (!response.ok) {
        const error = new Error('Failed to generate study lesson')
        if (response.status === 422) error.code = 'COURSE_POSITION_REQUIRED'
        throw error
    }

    return response.json()
}

export async function respondToStudyMessage(course, lesson, options) {
    const response = await requestStudyConversation(course, lesson, options)
    return response.json()
}

export async function respondToStudyMessageStream(course, lesson, options) {
    const response = await requestStudyConversation(course, lesson, options, true)
    return readStudyConversationStream(response, { signal: options.signal, onDelta: options.onDelta, topic: lesson.topic })
}

async function requestStudyConversation(
    course,
    lesson,
    { message, history = [], example = '', activityContext, signal, anchors = [] },
    streaming = false,
) {
    const response = await fetch('/api/respond-to-study-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(streaming ? { Accept: 'application/x-ndjson' } : {}),
        },
        signal,
        body: JSON.stringify({
            ...(streaming ? { stream: true } : {}),
            courseName: course.name,
            nextTask: course.nextTask,
            importantTopics: course.importantTopics,
            upcomingWork: course.upcomingWork,
            mastery: course.mastery?.overall ?? 40,
            topicMastery: course.mastery?.topics || {},
            ...coursePositionRequest(course),
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

    return response
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
            ...coursePositionRequest(course),
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
            ...coursePositionRequest(course),
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

export function recommendationCourses(courses) {
    // No files, transcripts, or unrelated memories leave the browser for recommendations.
    return courses.map((course) => {
        const position = coursePositionRequest(course)
        return {
        name: course.name, nextTask: course.nextTask, importantTopics: course.importantTopics,
        upcomingWork: course.upcomingWork, mastery: course.mastery,
        ...position,
        ...(position.recentLearning ? { recentLearning: {
            topic: position.recentLearning.topic, positionKey: position.recentLearning.positionKey,
            updatedAt: position.recentLearning.updatedAt,
        } } : {}),
        }
    })
}

export async function recommendCourse(courses, { signal, currentDate = localDate() } = {}) {
    const response = await fetch('/api/recommend-course', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({
            courses: recommendationCourses(courses),
            currentDate,
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
