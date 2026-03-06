import { AnimatedSection, Card, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Code2, GitBranch, Sparkles, Sword } from 'lucide-react'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/talks/')({
  component: TalksIndex,
})

export function TalksIndex() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      {/* Roxabi wordmark */}
      <div className="fixed left-6 top-6 z-50">
        <Link
          to="/"
          className="text-sm font-bold tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors uppercase"
        >
          Roxabi
        </Link>
      </div>

      <AnimatedSection className="w-full max-w-3xl">
        <h1 className="mb-12 text-center text-4xl font-bold tracking-tight lg:text-5xl">
          {m.talk_index_title()}
        </h1>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/talks/claude-code" className="group">
            <Card className="h-full transition-shadow duration-300 hover:shadow-lg">
              <CardHeader className="p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Code2 className="size-5" />
                </div>
                <CardTitle>{m.talk_index_claude_code_title()}</CardTitle>
                <CardDescription className="mt-2">
                  {m.talk_index_claude_code_subtitle()}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/talks/dev-process" className="group">
            <Card className="h-full transition-shadow duration-300 hover:shadow-lg">
              <CardHeader className="p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
                  <GitBranch className="size-5" />
                </div>
                <CardTitle>{m.talk_index_devprocess_title()}</CardTitle>
                <CardDescription className="mt-2">
                  {m.talk_index_devprocess_subtitle()}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/talks/lyra-story" className="group">
            <Card className="h-full transition-shadow duration-300 hover:shadow-lg">
              <CardHeader className="p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                  <Sparkles className="size-5" />
                </div>
                <CardTitle>{m.talk_index_lyrastory_title()}</CardTitle>
                <CardDescription className="mt-2">
                  {m.talk_index_lyrastory_subtitle()}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/talks/lyra-dev" className="group">
            <Card className="h-full transition-shadow duration-300 hover:shadow-lg">
              <CardHeader className="p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Sword className="size-5" />
                </div>
                <CardTitle>{m.talk_index_lyradev_title()}</CardTitle>
                <CardDescription className="mt-2">
                  {m.talk_index_lyradev_subtitle()}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </AnimatedSection>
    </div>
  )
}
