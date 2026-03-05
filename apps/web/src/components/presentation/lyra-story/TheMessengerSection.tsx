import { AnimatedSection, Badge, Card, CardContent } from '@repo/ui'
import { MessageCircle, Timer, Wrench } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { useLyraMode } from './LyraModeContext'

function TheMessengerSectionRpg() {
  const logs = [
    m.talk_ls_rpg_messenger_log1(),
    m.talk_ls_rpg_messenger_log2(),
    m.talk_ls_rpg_messenger_log3(),
  ]

  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 text-sm font-mono text-emerald-400 tracking-widest uppercase rpg-pixel text-[10px]">
            {m.talk_ls_rpg_messenger_zone()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-2 rpg-pixel leading-tight text-emerald-300">
            SUMMON: MESSENGER
          </h2>
        </AnimatedSection>

        {/* Terminal card */}
        <AnimatedSection className="mt-10">
          <div className="relative max-w-2xl mx-auto">
            <Card
              variant="subtle"
              className="border border-emerald-500/40 bg-gray-950/80"
              style={{ boxShadow: '0 0 30px rgba(80,200,120,0.15)' }}
            >
              {/* Scanlines overlay */}
              <div
                className="pointer-events-none absolute inset-0 rounded-[inherit] z-10"
                aria-hidden="true"
                style={{
                  background:
                    'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
                }}
              />
              <CardContent className="pt-6 pb-6 space-y-3 font-mono relative z-20">
                {/* Command */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-emerald-400"
                    style={{ textShadow: '0 0 8px var(--color-emerald-400, #34d399)' }}
                  >
                    {'>'}
                  </span>
                  <span
                    className="text-emerald-300 text-sm"
                    style={{ textShadow: '0 0 8px rgba(80,200,120,0.8)' }}
                  >
                    {m.talk_ls_rpg_messenger_terminal()}
                  </span>
                  <span
                    className="inline-block h-5 w-2.5 bg-emerald-400 ml-0.5 animate-pulse"
                    style={{ boxShadow: '0 0 6px rgba(80,200,120,0.9)', animationDuration: '0.8s' }}
                  />
                </div>

                {/* Log lines with staggered animation */}
                {logs.map((log, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static ordered log lines
                  <div
                    key={index}
                    className="text-xs text-emerald-200/70 animate-fade-in"
                    style={{
                      animationDelay: `${(index + 1) * 400}ms`,
                      animationFillMode: 'both',
                      textShadow: '0 0 4px rgba(80,200,120,0.4)',
                    }}
                  >
                    <span className="text-emerald-500/50 mr-2">
                      [{String(index + 1).padStart(2, '0')}]
                    </span>
                    {log}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}

export function TheMessengerSection() {
  const { isRpg } = useLyraMode()

  if (isRpg) return <TheMessengerSectionRpg />
  return (
    <div className="relative mx-auto max-w-5xl w-full">
      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
        {/* Left — chat bubbles mockup */}
        <div className="hidden lg:block space-y-3 max-w-xs">
          {[
            { text: m.talk_ls_messenger_cmd1(), sent: true, delay: '0ms' },
            { text: m.talk_ls_messenger_reply1(), sent: false, delay: '150ms' },
            { text: m.talk_ls_messenger_cmd2(), sent: true, delay: '300ms' },
            { text: m.talk_ls_messenger_reply2(), sent: false, delay: '450ms' },
            { text: m.talk_ls_messenger_cmd3(), sent: true, delay: '600ms' },
            { text: m.talk_ls_messenger_reply3(), sent: false, delay: '750ms' },
          ].map((bubble) => (
            <div
              key={bubble.delay}
              className={`flex ${bubble.sent ? 'justify-end' : 'justify-start'} animate-fade-in`}
              style={{ animationDelay: bubble.delay, animationFillMode: 'both' }}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-mono ${
                  bubble.sent
                    ? 'bg-blue-500/20 text-blue-700 dark:text-blue-200 border border-blue-500/30 rounded-br-none'
                    : 'bg-background border border-border text-muted-foreground rounded-bl-none'
                }`}
              >
                {bubble.text}
              </div>
            </div>
          ))}
        </div>

        {/* Right — content */}
        <div>
          <AnimatedSection>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <MessageCircle className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
                {m.talk_ls_messenger_title()}
              </h2>
            </div>
            <p className="text-lg text-muted-foreground">{m.talk_ls_messenger_subtitle()}</p>
          </AnimatedSection>

          <AnimatedSection className="mt-8 space-y-4">
            <Card variant="subtle" className="border border-orange-500/20 bg-orange-500/5">
              <CardContent className="pt-5 pb-5 flex items-start gap-3">
                <Wrench className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-orange-300">
                    {m.talk_ls_messenger_day1_label()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {m.talk_ls_messenger_day1_desc()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card variant="subtle" className="border border-blue-500/20 bg-blue-500/5">
              <CardContent className="pt-5 pb-5 flex items-start gap-3">
                <Timer className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-blue-300">
                    {m.talk_ls_messenger_prefetch_label()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {m.talk_ls_messenger_prefetch_desc()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>

          <AnimatedSection className="mt-6">
            <blockquote className="border-l-2 border-blue-500/40 pl-4">
              <p className="italic text-muted-foreground">"{m.talk_ls_messenger_quote()}"</p>
            </blockquote>
          </AnimatedSection>

          <AnimatedSection className="mt-6 flex flex-wrap gap-3">
            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30">
              {m.talk_ls_messenger_xp()}
            </Badge>
            <Badge variant="secondary" className="text-muted-foreground">
              {m.talk_ls_messenger_skill()}
            </Badge>
          </AnimatedSection>
        </div>
      </div>
    </div>
  )
}
