import { useEffect, useId, useRef, useState } from 'react'
import {
    generateStudyLesson,
    generateNextStudyLesson,
    explainStudyLessonDifferently,
    generateStudyExample,
    respondToStudyMessageStream,
    generateStudyActivity,
    evaluateStudyActivity,
    generateStudyQuestion,
    evaluateStudyAnswer,
} from '../services/meta'
import { MAX_STUDY_MESSAGE_LENGTH, MAX_STUDY_EXCHANGES, retainStudyExchanges } from '../services/studyConversation'
import { rememberLearningAnchor, anchorAfterFollowUp, retainLearningAnchors } from '../services/studyLearningContext'
import { compactThreadResume } from '../services/learnerMemory'
import { applyPositionOverride, readPositionStatement } from '../services/coursePosition'
import { selectStudyInteraction, studyThreadMetadata } from '../services/studyThreads'
import { acceptPathLesson, learningPathContextKey, generatedLessonVisual, normalizeLearningPath, recommendStudyAction, studyPathView } from '../services/learningPath'
import { createLessonImageCache } from '../services/lessonImages'
import CoursePosition from './CoursePosition'
import OrbitStage from './OrbitStage'
import { OrbitResponse } from './OrbitSignal'
import { studyThinkingContext } from './orbitThinking'
import { createStreamDisplay } from '../services/streamDisplay'
import useResultReveal from './useResultReveal'
import StudyContent from './StudyContent'
import StudyPath from './StudyPath'
import LessonVisual from './LessonVisual'
import { logVisualRouting } from '../services/visualDiagnostics'
import './StudySession.css'

export default function StudySession({
    course,
    threadId,
    initialThread,
    coursePositionKey,
    active = true,
    onThreadUpdate,
    onPositionChange,
    onNewThread,
    today,
    mastery,
    setMastery,
    updateTopicMastery,
}) {
    const [resume] = useState(() => compactThreadResume(initialThread?.resume))
    const [threadContext, setThreadContext] = useState(() => ({
        positionKey: initialThread?.positionKey || 'null', requestedTopic: initialThread?.requestedTopic || '',
    }))
    const [resumeSummary, setResumeSummary] = useState(initialThread?.resume ? initialThread.summary : '')
    const [activeInteraction, setActiveInteraction] = useState('lesson')
    const stage = activeInteraction === 'quiz' ? 'quiz' : 'learn'
    const [answerResult, setAnswerResult] = useState('')
    const [showAdaptedLesson, setShowAdaptedLesson] = useState(false)
    const [followUpResult, setFollowUpResult] = useState('')
    const [history, setHistory] = useState([])
    const [positionChanged, setPositionChanged] = useState(false)
    const [evaluationError, setEvaluationError] = useState('')
    const [selectedAnswer, setSelectedAnswer] = useState(null)
    const panel = useRef(null)
    const studyTools = useRef(null)
    const id = useId()
    const [lesson, setLesson] = useState(resume.lesson)
    const [learningPath, setLearningPath] = useState(() => normalizeLearningPath(resume.learningPath))
    const [progressionError, setProgressionError] = useState('')
    const nextLessonRequest = useRef(null)
    const contextKey = learningPathContextKey(course, today)
    const latestContextKey = useRef(contextKey)
    const pathView = studyPathView(learningPath, lesson, contextKey)
    const lessonVisual = generatedLessonVisual(lesson?.visual)
    const [lessonImageCache] = useState(createLessonImageCache)
    const illustratedLesson = activeInteraction === 'lesson' && Boolean(lessonVisual)
    const [example, setExample] = useState('')
    const [loadingLesson, setLoadingLesson] = useState(resume.lesson ? '' : 'lesson')
    const [lessonError, setLessonError] = useState('')
    const [lessonAttempt, setLessonAttempt] = useState(0)
    const [conversation, setConversation] = useState(resume.conversation)
    // One supplemental visual per mounted lesson. It is not part of saved exchanges or resume.
    const [conversationVisual, setConversationVisual] = useState(null)
    const [turnOffset, setTurnOffset] = useState(0)
    const [learningAnchors, setLearningAnchors] = useState(() => retainLearningAnchors([...(course.learningAnchors || []), ...resume.learningAnchors]))
    const [learnerMessage, setLearnerMessage] = useState('')
    const [loadingConversation, setLoadingConversation] = useState(false)
    // Only completed exchanges enter conversation/history and thread persistence.
    const [streamedResponse, setStreamedResponse] = useState('')
    const [pendingTurn, setPendingTurn] = useState(null)
    const currentTurn = useRef(null)
    const [conversationError, setConversationError] = useState('')
    const conversationRequest = useRef(null)
    const [activity, setActivity] = useState(null)
    const [activityResponse, setActivityResponse] = useState('')
    const [activityFeedback, setActivityFeedback] = useState(null)
    const [loadingActivity, setLoadingActivity] = useState('')
    const [activityError, setActivityError] = useState(null)
    const activityRequest = useRef(null)
    const [initialContext] = useState(() => ({ course, mastery }))
    const initialLessonRequest = useRef(null)
    const initialLessonLoaded = useRef(Boolean(resume.lesson))
    const [studyQuestion, setStudyQuestion] = useState(null)
    const [loadingQuestion, setLoadingQuestion] = useState(false)
    const [questionError, setQuestionError] = useState('')
    const [evaluation, setEvaluation] = useState(null)
    const [loadingEvaluation, setLoadingEvaluation] = useState(false)
    const [questionNumber, setQuestionNumber] = useState(0)
    const { resultReveal, showResult } = useResultReveal()
    const activityContext = activity ? {
        activity,
        learnerResponse: activityFeedback?.learnerResponse || '',
        feedback: activityFeedback?.feedback || '',
    } : undefined
    const busy = Boolean(loadingLesson || loadingConversation || loadingActivity || loadingQuestion || loadingEvaluation)
    const recommendation = recommendStudyAction({ lesson, activeInteraction, learningPath, example, lessonError, conversation,
        activity, activityError, activityFeedback, activityResponse, answerResult, followUpResult, evaluation, evaluationError, questionError })
    const lastPublished = useRef('')
    const companion = <OrbitStage thinking={busy} thinkingContext={studyThinkingContext({ loadingLesson, loadingConversation, loadingActivity, loadingQuestion, loadingEvaluation })} />

    useEffect(() => {
        if (!import.meta.env.DEV || !active || !lesson || !['lesson', 'conversation'].includes(activeInteraction)) return
        const source = activeInteraction === 'conversation' ? 'conversation' : 'lesson'
        const requested = source === 'lesson' ? lesson.visual : conversationVisual
        const normalized = generatedLessonVisual(requested)
        logVisualRouting(true, { source, phase: 'display', concept: lesson.concept, requested, normalized,
            rendered: Boolean(normalized) && !loadingLesson })
    }, [active, activeInteraction, lesson, conversationVisual, loadingLesson])

    useEffect(() => { latestContextKey.current = contextKey }, [contextKey])

    useEffect(() => {
        if (!lesson) return
        const snapshot = compactThreadResume({ lesson, conversation, learningAnchors, learningPath })
        const metadata = studyThreadMetadata({ lesson, activeInteraction, conversation, activity, activityFeedback, questionNumber, answerResult, followUpResult })
        const signature = JSON.stringify({ snapshot, metadata })
        if (lastPublished.current === signature) return
        const firstPublish = !lastPublished.current
        lastPublished.current = signature
        // Restoring a lesson is not new learning evidence and must not replace its saved summary.
        if (firstPublish && resume.lesson) return
        onThreadUpdate?.(threadId, { ...metadata, resume: snapshot, courseName: initialContext.course.name,
            ...threadContext, updatedAt: new Date().toISOString() })
    }, [threadId, onThreadUpdate, lesson, activeInteraction, conversation, activity, activityFeedback, questionNumber, answerResult, followUpResult, learningAnchors, learningPath, resume, initialContext, threadContext])

    useEffect(() => {
        if (active) panel.current?.focus({ preventScroll: false })
    }, [active, activeInteraction, lesson?.concept])

    useEffect(() => {
        if (!pendingTurn || !currentTurn.current) return
        const bounds = currentTurn.current.getBoundingClientRect()
        const visibleTop = window.visualViewport?.offsetTop || 0
        const visibleBottom = visibleTop + (window.visualViewport?.height || window.innerHeight)
        if (bounds.top < visibleTop || bounds.bottom > visibleBottom) {
            currentTurn.current.scrollIntoView({ block: 'nearest', behavior: 'auto' })
        }
    }, [pendingTurn])

    function openInteraction(next) {
        if (next !== 'conversation') {
            if (conversationRequest.current && pendingTurn) setLearnerMessage(pendingTurn.message)
            conversationRequest.current?.abort()
            conversationRequest.current = null
            setLoadingConversation(false)
            setStreamedResponse('')
            setPendingTurn(null)
            setConversationError('')
        }
        if (studyTools.current) studyTools.current.open = false
        if (next === activeInteraction) panel.current?.focus()
        setResumeSummary('')
        setActiveInteraction((current) => selectStudyInteraction(current, next))
    }

    function rememberInteraction(type, title, content, response = '') {
        setHistory((current) => [...current, { type, title: title.slice(0, 80), content, response }].slice(-12))
    }

    function changePosition(update) {
        onPositionChange?.(update)
        setPositionChanged(true)
    }

    useEffect(() => {
        if (!active || initialLessonLoaded.current) return
        let current = true

        // Reuse the request when StrictMode repeats effect setup on mount.
        if (!initialLessonRequest.current) {
            initialLessonRequest.current = generateStudyLesson(
                initialContext.course,
                initialContext.mastery,
                { anchors: initialContext.course.learningAnchors || [], path: normalizeLearningPath() }
            )
        }

        initialLessonRequest.current
            .then(async (result) => {
                if (current) await showResult('lesson', result.content)
                if (current) {
                    initialLessonLoaded.current = true
                    setLesson(result)
                    setLearningPath(acceptPathLesson(result, undefined, undefined, learningPathContextKey(initialContext.course)))
                }
            })
            .catch(() => {
                if (current) setLessonError('Orbit could not load your lesson. Please try again.')
            })
            .finally(() => {
                if (current) setLoadingLesson('')
            })

        return () => { current = false }
    }, [initialContext, lessonAttempt, active, resume, showResult])

    useEffect(() => {
        return () => {
            conversationRequest.current?.abort()
            activityRequest.current?.abort()
            nextLessonRequest.current?.abort()
        }
    }, [])

    function rememberAnchor(anchor) {
        if (anchor) setLearningAnchors((current) => rememberLearningAnchor(current, anchor))
    }

    async function sendMessage(event) {
        event.preventDefault()
        const message = learnerMessage.trim()
        if (!lesson || stage !== 'learn' || !message || loadingLesson ||
            loadingQuestion || activityRequest.current || conversationRequest.current) return

        const controller = new AbortController()
        conversationRequest.current = controller
        setLoadingConversation(true)
        setStreamedResponse('')
        setPendingTurn({ message })
        setLearnerMessage('')
        setConversationError('')
        setLessonError('')
        setQuestionError('')

        const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
        const display = createStreamDisplay({
            signal: controller.signal,
            reducedMotion: preference.matches,
            onUpdate: (text) => {
                if (!controller.signal.aborted && conversationRequest.current === controller) setStreamedResponse(text)
            },
        })
        const changeMotion = () => display.setReducedMotion(preference.matches)
        preference.addEventListener('change', changeMotion)
        try {
            const update = readPositionStatement(message, lesson.topic)
            if (update) changePosition(update)
            const requestCourse = update ? { ...course, learnerPosition: applyPositionOverride(course.learnerPosition, update) } : course
            const result = await respondToStudyMessageStream(requestCourse, lesson, {
                message,
                history: conversation,
                example,
                activityContext,
                currentVisual: conversationVisual || lessonVisual,
                anchors: learningAnchors,
                signal: controller.signal,
                onDelta: display.append,
            })
            await display.finish()
            if (controller.signal.aborted || conversationRequest.current !== controller) return

            const visual = generatedLessonVisual(result.visual)
            if (visual) setConversationVisual(visual)
            rememberAnchor(result.anchor)
            if (conversation.length === MAX_STUDY_EXCHANGES) {
                const oldest = conversation[0]
                rememberInteraction('conversation', oldest.message, oldest.message, oldest.response)
                setTurnOffset((current) => current + 1)
            }
            // Keep raw exchanges bounded in memory as well as in persistent storage.
            setConversation((current) => retainStudyExchanges([
                ...current,
                { message, response: result.response, signal: result.signal },
            ]))
            setPendingTurn(null)
        } catch {
            if (!controller.signal.aborted) {
                setLearnerMessage(message)
                setConversationError('Orbit’s reply was interrupted. Your message is still here; try sending it again.')
            }
        } finally {
            preference.removeEventListener('change', changeMotion)
            display.cancel()
            if (conversationRequest.current === controller) {
                conversationRequest.current = null
                setStreamedResponse('')
                setLoadingConversation(false)
            }
        }
    }

    async function runActivity(action) {
        const response = activityResponse.trim()
        if (!lesson || loadingLesson || loadingQuestion || loadingEvaluation ||
            conversationRequest.current || activityRequest.current ||
            (action === 'evaluate' && (!activity || !response))) return

        const controller = new AbortController()
        openInteraction('activity')
        activityRequest.current = controller
        setLoadingActivity(action)
        setActivityError(null)
        setLessonError('')
        setQuestionError('')

        try {
            const options = { history: conversation, example, signal: controller.signal, anchors: learningAnchors }
            const result = action === 'generate'
                ? await generateStudyActivity(course, lesson, { ...options, activityContext })
                : await evaluateStudyActivity(course, lesson, activity, response, options)
            await showResult(action === 'generate' ? 'activity' : 'response',
                action === 'generate' ? `## ${result.title}\n${result.instruction}` : result.feedback, controller.signal)
            if (controller.signal.aborted) return

            if (action === 'generate') {
                if (activity) rememberInteraction('activity', activity.title, `${activity.instruction}\n\nYour response: ${activityResponse || 'Not submitted'}`, activityFeedback?.feedback || '')
                setActivity(result)
                setActivityResponse('')
                setActivityFeedback(null)
            } else {
                rememberAnchor(result.anchor)
                setActivityFeedback({ ...result, learnerResponse: response })
            }
        } catch {
            if (!controller.signal.aborted) {
                setActivityError({
                    action,
                    message: action === 'generate'
                        ? 'Orbit could not prepare an activity. Please try again.'
                        : 'Orbit could not respond to your activity. Your response is still here; try again.',
                })
            }
        } finally {
            if (activityRequest.current === controller) {
                activityRequest.current = null
                setLoadingActivity('')
            }
        }
    }

    function submitActivity(event) {
        event.preventDefault()
        return runActivity('evaluate')
    }

    function retryLesson() {
        initialLessonRequest.current = null
        setLessonError('')
        setLoadingLesson('lesson')
        setLessonAttempt((attempt) => attempt + 1)
    }

    async function changeLesson(action) {
        if (loadingLesson || loadingQuestion || loadingConversation || loadingActivity) return
        openInteraction(action === 'example' ? 'example' : 'lesson')
        setLoadingLesson(action)
        setLessonError('')
        setQuestionError('')

        try {
            const result = action === 'simplify'
                ? await explainStudyLessonDifferently(course, lesson, example, { anchors: learningAnchors })
                : await generateStudyExample(course, lesson, example, { anchors: learningAnchors })
            await showResult(action, result.content)

            if (action === 'simplify') {
                rememberInteraction('lesson', lesson.concept, lesson.content)
                setLesson(result)
                setConversationVisual(null)
            } else {
                if (example) rememberInteraction('example', lesson.concept, example)
                setExample(result.content)
            }
        } catch {
            setLessonError('Orbit could not update this lesson. Please try that action again.')
        } finally {
            setLoadingLesson('')
        }
    }

    async function continueLesson() {
        if (!lesson || busy || nextLessonRequest.current) return
        const controller = new AbortController()
        nextLessonRequest.current = controller
        const requestedContextKey = contextKey
        setLoadingLesson('next')
        setProgressionError('')
        try {
            const result = await generateNextStudyLesson(course, mastery, lesson, {
                path: learningPath, anchors: learningAnchors, signal: controller.signal,
            })
            if (!controller.signal.aborted && latestContextKey.current === requestedContextKey) {
                await showResult('next', result.content, controller.signal)
            }
            if (controller.signal.aborted) return
            // A correction or material upload during generation must not install a stale lesson.
            if (latestContextKey.current !== requestedContextKey) {
                setProgressionError('Your course context changed while Orbit was preparing the next lesson. Please try again.')
                return
            }
            rememberInteraction('lesson', lesson.concept, lesson.content)
            for (const exchange of conversation) rememberInteraction('conversation', exchange.message, exchange.message, exchange.response)
            if (activity) rememberInteraction('activity', activity.title, activity.instruction, activityFeedback?.feedback || activityResponse)
            if (studyQuestion) rememberInteraction('quiz', studyQuestion.topic || 'Practice', studyQuestion.question, evaluation?.feedback || studyQuestion.explanation || '')
            const positionKey = coursePositionKey ?? JSON.stringify(course.learnerPosition || null)
            setThreadContext((current) => ({ positionKey, requestedTopic: current.positionKey === positionKey ? current.requestedTopic : '' }))
            setLearningPath(acceptPathLesson(result, learningPath, lesson, requestedContextKey))
            setLesson(result)
            setConversationVisual(null)
            // Clear only lesson-specific interactions after a successful transition.
            // Learning anchors, thread history, and course mastery continue independently.
            setExample('')
            setConversation([])
            setTurnOffset(0)
            setPendingTurn(null)
            setLearnerMessage('')
            setConversationError('')
            setActivity(null)
            setActivityResponse('')
            setActivityFeedback(null)
            setActivityError(null)
            setStudyQuestion(null)
            setQuestionNumber(0)
            setAnswerResult('')
            setFollowUpResult('')
            setShowAdaptedLesson(false)
            setEvaluation(null)
            setEvaluationError('')
            setSelectedAnswer(null)
            setQuestionError('')
            setLessonError('')
            setPositionChanged(false)
            openInteraction('lesson')
        } catch (error) {
            if (!controller.signal.aborted) {
                if (error.code === 'COURSE_POSITION_REQUIRED') {
                    openInteraction('lesson')
                    setProgressionError('Choose what your class is working on above, then continue to the next lesson.')
                } else {
                    setProgressionError('Orbit could not prepare the next lesson. Your place is saved; try again or keep exploring this lesson.')
                }
            }
        } finally {
            if (nextLessonRequest.current === controller) {
                nextLessonRequest.current = null
                setLoadingLesson('')
            }
        }
    }

    async function loadQuestion(lessonContext) {
        if (loadingQuestion || loadingLesson || loadingEvaluation) return
        if (studyQuestion) rememberInteraction('quiz', studyQuestion.topic || 'Practice', studyQuestion.question, `${answerResult || 'Not answered'}${evaluation ? `\n${evaluation.feedback}\n${evaluation.adaptedExplanation}\nFollow-up: ${followUpResult || 'Not answered'}` : studyQuestion.explanation ? `\n${studyQuestion.explanation}` : ''}`)
        openInteraction('quiz')
        setConversationError('')
        activityRequest.current?.abort()
        activityRequest.current = null
        setLoadingActivity('')
        setActivityError(null)
        setLoadingQuestion(true)
        setQuestionError('')
        setLessonError('')
        setEvaluationError('')

        try {
            const question = await generateStudyQuestion(course, mastery, lessonContext, { anchors: learningAnchors })
            await showResult('quiz', question.question)
            setStudyQuestion(question)
            setAnswerResult('')
            setFollowUpResult('')
            setShowAdaptedLesson(false)
            setEvaluation(null)
            setSelectedAnswer(null)
            setQuestionNumber((number) => number + 1)
        } catch {
            setQuestionError('Orbit could not load your question. Please try again.')
        } finally {
            setLoadingQuestion(false)
        }
    }

    function loadNextQuestion() {
        return loadQuestion()
    }

    function takeRecommendedStep() {
        if (busy) return
        switch (recommendation?.action) {
            case 'continue': return continueLesson()
            case 'example': return example ? openInteraction('example') : changeLesson('example')
            case 'activity': return activity ? openInteraction('activity') : runActivity('generate')
            case 'retryActivity': return runActivity('generate')
            case 'quiz': return studyQuestion ? openInteraction('quiz') : loadQuestion(lesson)
            case 'recover': return openInteraction('quiz')
            case 'retryExplanation': return answerQuestion(selectedAnswer, true)
            case 'retryQuiz': return loadQuestion(questionNumber ? undefined : lesson)
            case 'conversation': return openInteraction('conversation')
            case 'lesson': return openInteraction('lesson')
        }
    }

    async function answerQuestion(answer, retry = false) {
        if (busy || (answerResult && !retry)) return
        setSelectedAnswer(answer)
        setAnswerResult(answer.correct ? 'correct' : 'incorrect')
        setShowAdaptedLesson(!answer.correct)
        setFollowUpResult('')
        setEvaluation(null)
        setEvaluationError('')
        if (!retry) {
            if (studyQuestion.topic) updateTopicMastery(studyQuestion.topic, answer.correct ? 80 : 40)
            else setMastery(answer.correct ? 80 : 40)
        }
        if (answer.correct) return
        setLoadingEvaluation(true)
        try {
            const result = await evaluateStudyAnswer(course, studyQuestion, answer, mastery, { anchors: learningAnchors })
            await showResult('evaluation', `${result.feedback}\n\n${result.adaptedExplanation}\n\n${result.followUpQuestion}`)
            setEvaluation(result)
            rememberAnchor(result.anchor)
        } catch {
            setEvaluationError('Orbit could not prepare a different explanation. Your answer is saved; try again.')
        } finally {
            setLoadingEvaluation(false)
        }
    }

    return (
        <section className={`study-session${illustratedLesson ? ' study-session-illustrated' : ''}`}>
            <header className="study-context">
                <p className="study-subject"><span>{course.name}</span>{lesson && <span>Lesson {learningPath.step}</span>}</p>
                {lesson && <StudyPath path={pathView} />}
                {lesson && lesson.topic !== lesson.concept && <p className="study-topic">{lesson.topic}</p>}
                <h1>{lesson?.concept || course.nextTask || course.name}</h1>
            </header>
            {(!illustratedLesson || busy) && companion}
            <div className="study-body">
            <section className="study-active-panel" data-study-interaction={activeInteraction} ref={panel} tabIndex={-1} aria-label="Current study interaction">
            {resumeSummary && <p className="orbit-muted">Last time: {resumeSummary} Your lesson is ready to revisit; activities and quizzes start fresh.</p>}
            {positionChanged && <div className="study-position-notice" role="status">Your course starting point is updated. Continue when you are ready to use it.
                <button onClick={onNewThread}>Start a thread there</button>
            </div>}
            <OrbitResponse pending={loadingLesson === 'next'} context="next" reveal={resultReveal}>
            {activeInteraction === 'example' && <div className="study-example">
                <OrbitResponse pending={loadingLesson === 'example'} context="example" reveal={resultReveal}>
                    {example && <><StudyContent content={example} /><button disabled={busy} onClick={() => changeLesson('example')}>Another example</button></>}
                </OrbitResponse>
            </div>}
            {stage === 'learn' && (
                <div className="study-lesson">
                    {activeInteraction === 'lesson' && (
                        <OrbitResponse pending={loadingLesson === 'lesson' || loadingLesson === 'simplify'} context={loadingLesson === 'simplify' ? 'simplify' : 'lesson'} reveal={resultReveal}>
                        <div>
                            {lesson && <>
                            <div className={`study-lesson-composition${lessonVisual ? ' study-lesson-composition-visual' : ''}`}>
                                <StudyContent content={lesson.content} />
                                {lessonVisual && <div className="study-visual-presentation">
                                    {!busy && companion}
                                    <LessonVisual visual={lessonVisual} lesson={lesson} courseName={course.name} cache={lessonImageCache} active={active} />
                                </div>}
                            </div>
                            <div className="study-lesson-support">
                            <button disabled={busy} onClick={() => changeLesson('simplify')}>I lost you</button>
                            <CoursePosition course={course} today={today} showSummary={false} onChange={onPositionChange ? changePosition : undefined} />
                            </div>
                            </>}
                        </div>
                        </OrbitResponse>
                    )}

                    {lessonError && <p role="alert">{lessonError}</p>}
                    {!lesson && !loadingLesson && (
                        <button onClick={retryLesson}>Try again</button>
                    )}

                    {activeInteraction === 'activity' && (activity || loadingActivity || activityError) && (
                        <div className="study-activity" aria-busy={Boolean(loadingActivity)}>
                            <OrbitResponse pending={loadingActivity === 'generate'} context="activity" reveal={resultReveal}>
                            {activity && (
                                <>
                                    <div className="study-panel-heading"><h4>{activity.title}</h4><button disabled={busy} onClick={() => runActivity('generate')}>Another activity</button></div>
                                    <p>{activity.instruction}</p>
                                    <form onSubmit={submitActivity}>
                                        <label htmlFor={`study-activity-response-${id}`}>What did you try or notice?</label>
                                        <textarea
                                            id={`study-activity-response-${id}`}
                                            rows={3}
                                            maxLength={MAX_STUDY_MESSAGE_LENGTH}
                                            value={activityResponse}
                                            onChange={(event) => {
                                                setActivityResponse(event.target.value)
                                                if (activityError?.action === 'evaluate') setActivityError(null)
                                            }}
                                            readOnly={Boolean(loadingActivity)}
                                            disabled={Boolean(loadingLesson) || loadingQuestion || loadingConversation}
                                            required
                                        />
                                        <button
                                            className={!recommendation?.action ? 'study-primary-action' : undefined}
                                            type="submit"
                                            disabled={!activityResponse.trim() || Boolean(loadingLesson || loadingActivity) ||
                                                loadingQuestion || loadingConversation}
                                        >
                                            {activityError?.action === 'evaluate' ? 'Try again' : 'Share response'}
                                        </button>
                                    </form>
                                    {(loadingActivity === 'evaluate' || activityFeedback?.learnerResponse === activityResponse.trim()) && <OrbitResponse pending={loadingActivity === 'evaluate'} context="response" reveal={resultReveal}>
                                    <div>
                                        {activityFeedback?.learnerResponse === activityResponse.trim() && (
                                            <p><strong>Orbit:</strong> {activityFeedback.feedback}</p>
                                        )}
                                    </div>
                                    </OrbitResponse>}
                                </>
                            )}
                            </OrbitResponse>
                            {activityError && <p role="alert">{activityError.message}</p>}
                            {activityError?.action === 'generate' && (
                                <button
                                    disabled={Boolean(loadingLesson || loadingActivity) || loadingQuestion || loadingConversation}
                                    onClick={() => runActivity('generate')}
                                >
                                    Try again
                                </button>
                            )}
                        </div>
                    )}

                    {lesson && activeInteraction === 'conversation' && (
                        <div className="study-conversation">
                            <div className="study-transcript" aria-label="Lesson discussion">
                                {[...conversation, ...(pendingTurn ? [{ ...pendingTurn, pending: true }] : [])].map((exchange, index) => (
                                    <article className={`study-exchange${exchange.pending ? ' study-current-turn' : ''}`} key={turnOffset + index} ref={exchange.pending ? currentTurn : undefined}>
                                        <div className="study-message study-message-learner" aria-label="Your message"><p>{exchange.message}</p></div>
                                        <div className="study-message study-message-orbit" aria-label="Orbit reply">
                                            <OrbitResponse pending={exchange.pending && loadingConversation && !streamedResponse} busy={Boolean(exchange.pending && loadingConversation)} context="conversation">
                                                {exchange.pending ? streamedResponse && <div className="study-streaming-response" aria-hidden="true"><p>{streamedResponse}</p></div>
                                                    : <StudyContent content={exchange.response} />}
                                            </OrbitResponse>
                                            {exchange.pending && conversationError && <p role="alert">{conversationError}</p>}
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <LessonVisual visual={conversationVisual} lesson={lesson} courseName={course.name} cache={lessonImageCache} active={active} />
                            <form className="study-composer" onSubmit={sendMessage} aria-busy={loadingConversation}>
                                <label className="study-composer-label" htmlFor={`study-message-${id}`}>Ask about this idea or share a connection</label>
                                <textarea
                                    id={`study-message-${id}`}
                                    rows={2}
                                    maxLength={MAX_STUDY_MESSAGE_LENGTH}
                                    placeholder="Ask about this idea, or share a connection."
                                    value={learnerMessage}
                                    onChange={(event) => {
                                        setLearnerMessage(event.target.value)
                                    }}
                                    readOnly={loadingConversation}
                                    disabled={Boolean(loadingLesson || loadingActivity) || loadingQuestion}
                                    required
                                />
                                <button
                                    className={!recommendation?.action ? 'study-primary-action' : undefined}
                                    type="submit"
                                    disabled={!learnerMessage.trim() || Boolean(loadingLesson || loadingActivity) ||
                                        loadingQuestion || loadingConversation}
                                >
                                    {conversationError ? 'Try again' : 'Send'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {stage === 'quiz' && <h3>Question {questionNumber}{studyQuestion?.topic && studyQuestion.topic !== lesson?.topic ? ` · ${studyQuestion.topic}` : ''}</h3>}

            {questionError && (
                <div role="alert">
                    <p>{questionError}</p>
                    {stage === 'quiz' && (
                        <button onClick={() => loadQuestion(questionNumber ? undefined : lesson)}>Try again</button>
                    )}
                </div>
            )}

            {stage === 'quiz' && (
                <div className="study-quiz">
                    <OrbitResponse pending={loadingQuestion || loadingEvaluation} context={loadingEvaluation ? 'evaluation' : 'quiz'} reveal={resultReveal}>
                    {studyQuestion && !(showAdaptedLesson && evaluation) && (
                        <p>{studyQuestion.question}</p>
                    )}
                    {selectedAnswer && !(showAdaptedLesson && evaluation) && <p className="orbit-muted">Your answer: {selectedAnswer.text}</p>}
                    {evaluationError && <div role="alert"><p>{evaluationError}</p><button onClick={() => answerQuestion(selectedAnswer, true)}>Try again</button></div>}

                    {!answerResult && studyQuestion?.answers?.map((answer) => (
                        <button className="study-answer"
                            key={answer.text}
                            disabled={busy}
                            onClick={() => answerQuestion(answer)}
                        >
                            {answer.text}
                        </button>
                    ))}

                    {answerResult === 'correct' && studyQuestion && (
                        <p>{studyQuestion.explanation}</p>
                    )}

                    {answerResult === 'correct' && (
                        <button disabled={busy} onClick={loadNextQuestion}>
                            Next question
                        </button>
                    )}

                    {answerResult === 'incorrect' && evaluation && (
                        <p>{evaluation.feedback}</p>
                    )}

                    {showAdaptedLesson && evaluation && (
                        <div className="study-adapted">
                            <details><summary>Review the original question</summary><p>{studyQuestion.question}</p><p>Your answer: {selectedAnswer?.text}</p></details>
                            <h3>Orbit changed the approach</h3>

                            <p>{evaluation.adaptedExplanation}</p>

                            <h4>Try this instead:</h4>

                            <p>{evaluation.followUpQuestion}</p>

                            {evaluation.followUpAnswers.map((answer) => (
                                <button className="study-answer"
                                    key={answer.text}
                                    disabled={busy}
                                    onClick={() => {
                                        rememberAnchor(anchorAfterFollowUp(evaluation.anchor, answer.correct))
                                        if (answer.correct) {
                                            setFollowUpResult('correct')
                                            if (studyQuestion.topic) {
                                                updateTopicMastery(studyQuestion.topic, 70)
                                            } else {
                                                setMastery(70)
                                            }
                                        } else {
                                            setFollowUpResult('incorrect')
                                            if (studyQuestion.topic) {
                                                updateTopicMastery(studyQuestion.topic, 40)
                                            } else {
                                                setMastery(40)
                                            }
                                        }
                                    }}
                                >
                                    {answer.text}
                                </button>
                            ))}

                            {followUpResult === 'correct' && (
                                <p>
                                    You got the follow-up. Keep practicing or continue when you are ready.
                                </p>
                            )}

                            {followUpResult === 'correct' && (
                                <button disabled={busy} onClick={loadNextQuestion}>
                                    Next question
                                </button>
                            )}

                            {followUpResult === 'incorrect' && (
                                <p>
                                    Revisit the explanation or talk through what still feels unclear.
                                </p>
                            )}
                        </div>
                    )}
                    </OrbitResponse>
                </div>
            )}
            </OrbitResponse>
            </section>
            {lesson && <details className="study-tools" ref={studyTools}>
                <summary>Study tools <span>· {{ lesson: 'Lesson', example: 'Example', activity: 'Activity', conversation: 'Talk it through', quiz: 'Quiz', history: 'Earlier work' }[activeInteraction]}</span></summary>
                <div className="study-lesson-actions" role="group" aria-label="Choose a study interaction">
                <button disabled={busy} aria-pressed={activeInteraction === 'lesson'} onClick={() => openInteraction('lesson')}>Lesson</button>
                <button disabled={busy} aria-pressed={activeInteraction === 'example'} onClick={() => example ? openInteraction('example') : changeLesson('example')}>Give me an example</button>
                <button disabled={busy} aria-pressed={activeInteraction === 'activity'} onClick={() => activity ? openInteraction('activity') : runActivity('generate')}>Let me try it</button>
                <button disabled={busy} aria-pressed={activeInteraction === 'conversation'} onClick={() => openInteraction('conversation')}>Talk it through</button>
                <button disabled={Boolean(loadingLesson || loadingQuestion || loadingEvaluation)} aria-pressed={activeInteraction === 'quiz'} onClick={() => studyQuestion ? openInteraction('quiz') : loadQuestion(lesson)}>Quiz me</button>
                </div>
            </details>}
            {lesson && <nav className="study-continuation" aria-label="Lesson progression" aria-busy={busy}>
                <div className="study-recommendation">
                    <p><strong>Suggested next</strong><span>{recommendation.hint}</span></p>
                    {recommendation.action && <button className="study-primary-action" disabled={busy} onClick={takeRecommendedStep}>
                        {recommendation.action === 'continue'
                            ? loadingLesson === 'next' ? 'Preparing next lesson…' : progressionError ? 'Try next lesson again' : recommendation.label
                            : recommendation.label}
                    </button>}
                </div>
                <div className="study-continue-actions">
                    {activeInteraction === 'lesson' && <button disabled={busy} aria-pressed={learningPath.understood} onClick={() => setLearningPath((current) => ({ ...current, understood: !current.understood }))}>
                        {learningPath.understood ? 'Feeling ready' : 'I understand'}
                    </button>}
                    {recommendation.action !== 'continue' && <button disabled={busy} onClick={continueLesson}>
                        {loadingLesson === 'next' ? 'Preparing next lesson…' : progressionError ? 'Try next lesson again' : 'Continue to next lesson'}
                    </button>}
                </div>
                {progressionError && <p role="alert">{progressionError}</p>}
            </nav>}
            {history.length > 0 && <details className="study-history">
                <summary>Earlier in this thread <span>· {history.length}</span></summary>
                <ol>{history.map((entry, index) => <li key={index}>
                    <details className="study-history-entry">
                        <summary><small>{entry.type === 'conversation' ? 'Discussion' : entry.type}</small><span>{entry.title}</span></summary>
                        {entry.type === 'conversation' ? <div className="study-exchange">
                            <div className="study-message study-message-learner" aria-label="Your message"><p>{entry.content}</p></div>
                            <div className="study-message study-message-orbit" aria-label="Orbit reply"><StudyContent content={entry.response} /></div>
                        </div> : <><StudyContent content={entry.content} />{entry.response && <StudyContent content={entry.response} />}</>}
                    </details>
                </li>)}</ol>
            </details>}
            </div>
            <footer className="study-progress">
                <ol className="study-stages" aria-label="Session progress">
                    <li aria-current={stage === 'learn' ? 'step' : undefined}>Learn & try</li>
                    <li aria-current={stage === 'quiz' ? 'step' : undefined}>Practice{stage === 'quiz' ? ` · Question ${questionNumber}` : ''}</li>
                </ol>
                <p className="study-mastery">Mastery · {mastery}%</p>
            </footer>
        </section>
    )
}
