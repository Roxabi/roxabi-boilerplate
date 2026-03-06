import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

const craftItems = () => [
  {
    label: m.talk_ld_craft_item1_label(),
    name: m.talk_ld_craft_item1(),
    color: 'border-purple-400/30 bg-purple-500/5 text-purple-300',
    labelColor: 'text-purple-400',
  },
  {
    label: m.talk_ld_craft_item2_label(),
    name: m.talk_ld_craft_item2(),
    color: 'border-emerald-400/30 bg-emerald-500/5 text-emerald-300',
    labelColor: 'text-emerald-400',
  },
  {
    label: m.talk_ld_craft_item3_label(),
    name: m.talk_ld_craft_item3(),
    color: 'border-blue-400/30 bg-blue-500/5 text-blue-300',
    labelColor: 'text-blue-400',
  },
]

export function CraftSystemSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[350px] w-[500px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-emerald-500/6 blur-[140px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-emerald-400 uppercase">
            {m.talk_ld_craft_subtitle()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6 font-mono text-emerald-300">
            {m.talk_ld_craft_title()}
          </h2>
        </AnimatedSection>

        <AnimatedSection>
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl">
            {craftItems().map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border px-5 py-5 space-y-2 ${item.color}`}
              >
                <p className={`font-mono text-[9px] tracking-widest uppercase ${item.labelColor}`}>
                  {item.label}
                </p>
                <p className="font-mono text-sm font-semibold leading-snug">{item.name}</p>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-7">
          <div className="max-w-md rounded-xl border border-emerald-400/20 bg-black/40 overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-emerald-400/10 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-red-500/50" />
              <div className="h-2 w-2 rounded-full bg-amber-500/50" />
              <div className="h-2 w-2 rounded-full bg-emerald-500/50" />
              <span className="ml-2 font-mono text-[9px] text-muted-foreground/40">
                roxabi-claude-config
              </span>
            </div>
            <pre className="px-4 py-4 font-mono text-xs leading-relaxed text-emerald-300/80 overflow-x-auto">
              <span className="text-muted-foreground/40">{`# Machine 1 becomes Lyra\n`}</span>
              <span>{`alias lyra='ssh lyra@machine1'\n`}</span>
              <span className="text-emerald-400">{`lyra /voice "Generate a 5-min vocal on the new engine"`}</span>
            </pre>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-5">
          <p className="font-mono text-sm text-muted-foreground/60 italic max-w-lg">
            {m.talk_ld_craft_note()}
          </p>
        </AnimatedSection>

        <AnimatedSection className="mt-5">
          <p className="font-mono text-[10px] tracking-widest text-emerald-400/70 uppercase">
            {m.talk_ld_craft_skill()} &nbsp;·&nbsp; {m.talk_ld_craft_trait()}
          </p>
        </AnimatedSection>
      </div>
    </div>
  )
}
