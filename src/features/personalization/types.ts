export type FeedbackSignal =
  | 'relevant'
  | 'not_relevant'
  | 'save'
  | 'dismiss'
  | 'more_like_this'
  | 'less_like_this'
  | 'too_technical'

export type FeedbackOption = {
  signal: FeedbackSignal
  label: string
  emoji: string
}

export const FEEDBACK_OPTIONS: FeedbackOption[] = [
  { signal: 'relevant', label: 'Useful', emoji: '👍' },
  { signal: 'dismiss', label: 'Not useful', emoji: '👎' },
  { signal: 'more_like_this', label: 'More like this', emoji: '➕' },
  { signal: 'less_like_this', label: 'Less like this', emoji: '➖' },
  { signal: 'not_relevant', label: 'Not relevant', emoji: '🚫' },
  { signal: 'too_technical', label: 'Too technical', emoji: '🧪' },
]

export type PersonalizationContext = {
  interests: Array<{ interestType: string; value: string; weight: number }>
  followedTopics: string[]
  feedback: FeedbackSignal[]
  preferences: {
    breakingAlertsEnabled: boolean
    morningDigestEnabled: boolean
    eveningDigestEnabled: boolean
    weeklyDigestEnabled: boolean
    notificationThreshold: number
  }
}

export type PersonalizedRelevance = {
  finalScore: number
  decision: 'BREAKING' | 'DIGEST' | 'STORE_ONLY' | 'IGNORE'
  explanations: string[]
  deliveryExplanation: string[]
  feedbackAdjustment: number
}
