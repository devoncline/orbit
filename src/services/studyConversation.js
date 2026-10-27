export const MAX_STUDY_EXCHANGES = 4
export const MAX_STUDY_MESSAGE_LENGTH = 600
export const MAX_STUDY_RESPONSE_LENGTH = 900

export function retainStudyExchanges(exchanges) {
    return exchanges.slice(-MAX_STUDY_EXCHANGES)
}
