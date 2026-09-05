import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/features/articles/components/PageHeader'
import { LearningCard } from '@/features/articles/components/ArticleCard'
import { fetchLearningTopics } from '@/features/articles/api/articles'
import { Skeleton } from '@/components/ui/skeleton'
import { GraduationCap } from 'lucide-react'
import { EmptyState } from '@/features/articles/components/EmptyState'

export function LearningPage() {
  const [topics, setTopics] = useState<Array<{ id: string; title: string; description: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchLearningTopics()
      .then((result) => {
        if (!cancelled) setTopics(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load topics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <PageContainer wide>
      <PageHeader
        title="Learning"
        description="Structured learning topics and curated technical deep-dives."
      />

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No learning topics yet"
          description="Learning paths will appear here as Nexora curates technical deep-dives."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <LearningCard key={topic.id} title={topic.title} description={topic.description} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
