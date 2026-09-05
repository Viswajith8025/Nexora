import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { PersonalizedRelevance } from '../types'

export function RelevanceExplanation({
  relevance,
  show = true,
}: {
  relevance: PersonalizedRelevance | null
  show?: boolean
}) {
  if (!show || !relevance || relevance.deliveryExplanation.length === 0) return null

  const isHighPriority = ['BREAKING', 'DIGEST'].includes(relevance.decision)

  if (!isHighPriority && relevance.finalScore < 70) return null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <p className="text-sm font-medium">Why did Nexora send this?</p>
        <p className="text-xs text-muted-foreground">
          Personalized score {relevance.finalScore} · {relevance.decision.replace('_', ' ')}
        </p>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-sm font-medium">Because:</p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {relevance.deliveryExplanation.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
