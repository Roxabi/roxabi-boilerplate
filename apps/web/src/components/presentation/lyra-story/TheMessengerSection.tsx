import { AnimatedSection, Badge, Card, CardContent } from '@repo/ui'
import { MessageCircle, Timer, Wrench } from 'lucide-react'
import { m } from '@/paraglide/messages'

export function TheMessengerSection() {
  return (
    <div className="relative mx-auto max-w-5xl w-full">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-1/3 h-[350px] w-[350px] -translate-x-1/3 rounded-full bg-blue-500/6 blur-[100px] dark:bg-blue-500/12" />
        <div className="absolute right-1/4 bottom-0 h-[300px] w-[300px] translate-y-1/4 rounded-full bg-purple-500/5 blur-[80px] dark:bg-purple-500/10" />
      </div>

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
