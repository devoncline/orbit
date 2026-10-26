import { useEffect, useState } from 'react'
import { generateStudyQuestion } from '../services/meta'

export default function StudySession({
    course,
    answerResult,
    setAnswerResult,
    showAdaptedLesson,
    setShowAdaptedLesson,
    followUpResult,
    setFollowUpResult,
    mastery,
    setMastery,
}) {
    const [studyQuestion, setStudyQuestion] = useState(null)
    const [loadingQuestion, setLoadingQuestion] = useState(true)

    useEffect(() => {
        async function loadQuestion() {
            try {
                const question = await generateStudyQuestion(course, mastery)
                setStudyQuestion(question)
            } catch (error) {
                console.error(error)
            } finally {
                setLoadingQuestion(false)
            }
        }

        loadQuestion()
    }, [])

    return (
        <section>
            <h2>{course.name} Session</h2>
            <p>{course.nextTask}</p>

            <p>Mastery: {mastery}%</p>

            {course.importantTopics?.length > 0 && (
                <p>
                    Focus topics: {course.importantTopics.join(', ')}
                </p>
            )}

            <h3>Question 1</h3>

            {loadingQuestion && <p>Orbit is building your question...</p>}

            {studyQuestion && (
                <p>{studyQuestion.question}</p>
            )}

            {studyQuestion?.answers?.map((answer) => (
                <button
                    key={answer.text}
                    onClick={() => {
                        if (answer.correct) {
                            setAnswerResult('correct')
                            setShowAdaptedLesson(false)
                            setFollowUpResult('')
                            setMastery(80)
                        } else {
                            setAnswerResult('incorrect')
                            setShowAdaptedLesson(true)
                            setFollowUpResult('')
                            setMastery(40)
                        }
                    }}
                >
                    {answer.text}
                </button>
            ))}

            {answerResult === 'correct' && (
                <p>
                    Correct. Photosynthesis converts light energy into chemical energy.
                </p>
            )}

            {answerResult === 'incorrect' && (
                <p>
                    Not quite. Orbit noticed a gap, so the next step should explain this
                    differently before moving on.
                </p>
            )}

            {showAdaptedLesson && (
                <div>
                    <h3>Orbit changed the approach</h3>

                    <p>Think of a plant like a tiny solar-powered factory.</p>

                    <p>
                        Sunlight is the energy source. The plant uses that energy to make
                        glucose, which stores chemical energy the plant can use later.
                    </p>

                    <h4>Try this instead:</h4>

                    <p>
                        If sunlight gives the plant energy, where does that energy end up?
                    </p>

                    <button
                        onClick={() => {
                            setFollowUpResult('correct')
                            setMastery(70)
                        }}
                    >
                        Stored in glucose
                    </button>

                    <button
                        onClick={() => {
                            setFollowUpResult('incorrect')
                            setMastery(40)
                        }}
                    >
                        Stored in oxygen
                    </button>

                    <button
                        onClick={() => {
                            setFollowUpResult('incorrect')
                            setMastery(40)
                        }}
                    >
                        Stored in the soil
                    </button>

                    {followUpResult === 'correct' && (
                        <p>
                            Nice. That shows the concept is starting to click. Orbit can now
                            move you forward.
                        </p>
                    )}

                    {followUpResult === 'incorrect' && (
                        <p>Orbit would simplify the idea again before advancing.</p>
                    )}
                </div>
            )}
        </section>
    )
}