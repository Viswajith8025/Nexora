import type { FeedbackSignal } from '@/features/personalization/types'
import type { ArticleWithSource } from '@/features/articles/types'

export function feedbackEffectMessage(signal: FeedbackSignal, article: ArticleWithSource): string {
  const topic =
    article.tags[0] ??
    article.category ??
    article.title.split(' ').slice(0, 2).join(' ')

  switch (signal) {
    case 'more_like_this':
      return `${topic} stories will rank higher.`
    case 'less_like_this':
      return `${topic} stories will rank lower.`
    case 'relevant':
      return `We'll surface more like "${article.title.slice(0, 40)}…".`
    case 'not_relevant':
    case 'dismiss':
      return `${topic} stories will appear less often.`
    case 'too_technical':
      return `We'll simplify ${topic} coverage.`
    case 'save':
      return 'Saved to your reading list.'
    default:
      return 'Your preferences were updated.'
  }
}
