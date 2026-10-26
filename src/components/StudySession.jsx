export default function StudySession({
    answerResult,
    setAnswerResult,
    showAdaptedLesson,
    setShowAdaptedLesson,
    followUpResult,
    setFollowUpResult,
}) {
    return (
        <section>
            <h2>Biology Session</h2>
            <p>Let’s review photosynthesis.</p>

            <p>Mastery: {mastery}%</p>

            <h3>Question 1</h3>
            <p>What is the main purpose of photosynthesis?</p>

            <button
                onClick={() => {
                    setAnswerResult('incorrect')
                    setShowAdaptedLesson(true)
                    setFollowUpResult('')
                }}
            >
                To make oxygen for animals
            </button>

            <button
                onClick={() => {
                    setAnswerResult('correct')
                    setShowAdaptedLesson(false)
                    setFollowUpResult('')
                }}
            >
                To convert light energy into chemical energy
            </button>

            <button
                onClick={() => {
                    setAnswerResult('incorrect')
                    setShowAdaptedLesson(true)
                    setFollowUpResult('')
                }}
            >
                To absorb nutrients from the soil
            </button>

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

                    <button onClick={() => setFollowUpResult('correct')}>
                        Stored in glucose
                    </button>

                    <button onClick={() => setFollowUpResult('incorrect')}>
                        Stored in oxygen
                    </button>

                    <button onClick={() => setFollowUpResult('incorrect')}>
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