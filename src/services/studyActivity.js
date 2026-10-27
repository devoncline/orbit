import { MAX_STUDY_MESSAGE_LENGTH, MAX_STUDY_RESPONSE_LENGTH } from './studyConversation.js'

export const STUDY_ACTIVITY_TYPES = [
    'build', 'modify', 'predict', 'sort', 'match', 'explain',
    'compare', 'simulate_mentally', 'design', 'identify',
]

export function isShortText(value, maxLength) {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

export function isStudyActivity(activity, topic) {
    return Boolean(activity &&
        isShortText(activity.title, 80) &&
        isShortText(activity.instruction, 900) &&
        activity.instruction.trim().split(/\s+/).length <= 100 &&
        isShortText(activity.successCriteria, 400) &&
        isShortText(activity.topic, 120) && activity.topic === topic &&
        STUDY_ACTIVITY_TYPES.includes(activity.activityType))
}

export function selectStudyActivity(activity) {
    return {
        title: activity.title,
        instruction: activity.instruction,
        activityType: activity.activityType,
        successCriteria: activity.successCriteria,
        topic: activity.topic,
    }
}

export function isStudyActivityContext(context, topic) {
    return Boolean(context && isStudyActivity(context.activity, topic) &&
        typeof context.learnerResponse === 'string' && context.learnerResponse.length <= MAX_STUDY_MESSAGE_LENGTH &&
        typeof context.feedback === 'string' && context.feedback.length <= MAX_STUDY_RESPONSE_LENGTH)
}
