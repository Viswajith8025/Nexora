import type { LucideIcon } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type FeaturePlaceholderProps = {
  title: string
  description: string
  icon: LucideIcon
  phase: string
}

export function FeaturePlaceholder({ title, description, icon: Icon, phase }: FeaturePlaceholderProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Coming in a future phase</CardTitle>
          <CardDescription>
            This route is scaffolded as part of the {phase} foundation. Feature implementation
            will be added in subsequent development prompts.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
