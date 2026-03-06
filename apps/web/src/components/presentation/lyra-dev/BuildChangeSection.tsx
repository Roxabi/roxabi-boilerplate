import { AnimatedSection, Badge, Card, CardContent } from '@repo/ui'
import { m } from '@/paraglide/messages'

export function BuildChangeSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-[350px] w-[350px] translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-500/8 blur-[120px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-emerald-400 uppercase">
            {m.talk_ld_build_date()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6 font-mono text-emerald-300">
            {m.talk_ld_build_title()}
          </h2>
        </AnimatedSection>

        <div className="grid gap-5 md:grid-cols-2 max-w-3xl">
          {/* Knowledge Base — Legendary Loot */}
          <AnimatedSection>
            <Card
              variant="subtle"
              className="h-full border border-amber-400/40 bg-amber-500/5"
              style={{ boxShadow: '0 0 30px rgba(245,158,11,0.08)' }}
            >
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="border border-amber-400/60 bg-amber-500/15 text-amber-300 font-mono text-[8px] tracking-widest uppercase">
                    {m.talk_ld_build_loot_label()}
                  </Badge>
                </div>
                <p className="font-mono text-xl font-bold text-amber-200">
                  {m.talk_ld_build_loot()}
                </p>
                <p className="font-mono text-xs text-amber-300/60">
                  {m.talk_ld_build_loot_stats()}
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Telegram Bot — Game Changer */}
          <AnimatedSection>
            <Card variant="subtle" className="h-full border border-emerald-400/30 bg-emerald-500/5">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="border border-emerald-400/50 bg-emerald-500/10 text-emerald-300 font-mono text-[8px] tracking-widest uppercase">
                    {m.talk_ld_build_bot_label()}
                  </Badge>
                </div>
                <p className="font-mono text-sm font-semibold text-emerald-200">
                  {m.talk_ld_build_bot()}
                </p>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>

        <AnimatedSection className="mt-6">
          <div className="rounded-xl border border-blue-400/20 bg-blue-500/5 px-5 py-4 max-w-3xl">
            <p className="font-mono text-sm text-blue-300/80">
              <span className="text-blue-400">{'>'}</span> {m.talk_ld_build_discovery()}
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-5">
          <p className="font-mono text-[10px] tracking-widest text-emerald-400/70 uppercase">
            {m.talk_ld_build_xp()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
