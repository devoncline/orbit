import { lessonReferenceRequest } from './lessonReferences.js'
import { retainStudyExchanges } from './studyConversation.js'
import { readStudyConversationStream } from './studyConversationStream.js'
import { learningAnchorRequest } from './studyLearningContext.js'
import { coursePositionRequest, inferCoursePosition, localDate } from './coursePosition.js'
import { learningPathContextKey, generatedLessonVisual, normalizeLearningPath } from './learningPath.js'
import { learningProfileRequest } from './learningProfile.js'
import { canAnalyzeMaterial, courseMaterialContext, materialValidationError, readMaterialData } from './courseMaterials.js'
import { demoAiFetch } from './demoUsage.js'

export async function analyzeCourseFile(file, materialKind = 'syllabus') {
    if (!canAnalyzeMaterial(file) || materialValidationError(file)) throw new Error('Unsupported course material')
    const base64File = await readMaterialData(file)

    const response = await demoAiFetch('/api/analyze-course', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: base64File,
            currentDate: localDate(),
            materialKind,
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to analyze course file')
    }

    return response.json()
}

export function generateStudyLesson(course, mastery, options = {}) {
    return requestStudyLesson(course, mastery, 'lesson', undefined, undefined, options)
}

export function generateNextStudyLesson(course, mastery, lesson, options = {}) {
    const currentPath = normalizeLearningPath(options.path)
    // Do not present outdated suggestions as the plan after new material or learner evidence.
    if (currentPath.contextKey !== learningPathContextKey(course)) currentPath.upcoming = []
    return requestStudyLesson(course, mastery, 'next', lesson, undefined, { ...options, path: currentPath })
}

export function explainStudyLessonDifferently(course, lesson, example = '', options = {}) {
    return requestStudyLesson(course, course.mastery?.overall ?? 40, 'simplify', lesson, example, options)
}

export function generateStudyExample(course, lesson, example = '', options = {}) {
    return requestStudyLesson(course, course.mastery?.overall ?? 40, 'example', lesson, example, options)
}

async function requestStudyLesson(course, mastery, action, lesson, example, { anchors = [], path, signal, learningProfile, lessonReferences } = {}) {
    const response = await demoAiFetch('/api/generate-study-lesson', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({
            courseName: course.name,
            ...learningProfileRequest(learningProfile),
            ...lessonReferenceRequest(lessonReferences),
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
    const { visual: value, ...reply } = await response.json()
    const visual = generatedLessonVisual(value)
    return { ...reply, ...(visual ? { visual } : {}) }
}

export async function respondToStudyMessageStream(course, lesson, options) {
    const response = await requestStudyConversation(course, lesson, options, true)
    return readStudyConversationStream(response, { signal: options.signal, onDelta: options.onDelta, topic: lesson.topic })
}

async function requestStudyConversation(
    course,
    lesson,
    { message, history = [], example = '', activityContext, signal, anchors = [], currentVisual, learningProfile, lessonReferences },
    streaming = false,
) {
    const visual = generatedLessonVisual(currentVisual)
    const response = await demoAiFetch('/api/respond-to-study-message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(streaming ? { Accept: 'application/x-ndjson' } : {}),
        },
        signal,
        body: JSON.stringify({
            ...(streaming ? { stream: true } : {}),
            ...learningProfileRequest(learningProfile),
            ...lessonReferenceRequest(lessonReferences),
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
            ...(visual ? { currentVisual: visual } : {}),
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
    { history = [], example = '', activity, learnerResponse, activityContext, signal, anchors = [], learningProfile, lessonReferences }
) {
    const response = await demoAiFetch('/api/study-activity', {
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
            ...learningProfileRequest(learningProfile),
            ...lessonReferenceRequest(lessonReferences),
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

export async function generateStudyQuestion(course, mastery, lesson, { anchors = [], learningProfile, lessonReferences } = {}) {
    const response = await demoAiFetch('/api/generate-study-question', {
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
            ...learningProfileRequest(learningProfile),
            ...lessonReferenceRequest(lessonReferences),
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
    { anchors, learningProfile, lessonReferences } = {}
) {
    const correctAnswer = studyQuestion.answers.find(
        (answer) => answer.correct
    )

    const response = await demoAiFetch('/api/evaluate-study-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            courseName: course.name,
            question: studyQuestion.question,
            ...(courseMaterialContext(course.files).length ? { materialContext: courseMaterialContext(course.files, studyQuestion.topic) } : {}),
            selectedAnswer: selectedAnswer.text,
            ...learningProfileRequest(learningProfile),
            ...lessonReferenceRequest(lessonReferences),
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
    const response = await demoAiFetch('/api/recommend-course', {
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
