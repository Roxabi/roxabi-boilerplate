import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

const removed = () => [m.talk_ld_patch_removed1(), m.talk_ld_patch_removed2()]
const added = () => [m.talk_ld_patch_added1(), m.talk_ld_patch_added2(), m.talk_ld_patch_added3()]
const known = () => [m.talk_ld_patch_known1(), m.talk_ld_patch_known2()]

export function PatchNotesSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[300px] w-[300px] -translate-x-1/4 -translate-y-1/4 rounded-full bg-amber-500/8 blur-[100px]" />
      </div>

      <div className="relative">
        <AnimatedSection>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-amber-400 uppercase">
            {m.talk_ld_patch_subtitle()}
          </div>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6 font-mono text-amber-300">
            {m.talk_ld_patch_title()}
          </h2>
        </AnimatedSection>

        <AnimatedSection>
          <div className="overflow-hidden rounded-xl border border-amber-400/25 bg-[#0d0f0a] max-w-2xl font-mono text-sm">
            {/* Terminal header */}
            <div className="flex items-center gap-2 border-b border-amber-400/20 bg-amber-500/5 px-4 py-3">
              <div className="h-2 w-2 rounded-full bg-red-400/60" />
              <div className="h-2 w-2 rounded-full bg-amber-400/60" />
              <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
              <span className="ml-2 text-[9px] tracking-widest text-amber-400/60 uppercase">
                {m.talk_ld_patch_version()}
              </span>
            </div>

            <div className="divide-y divide-amber-400/10">
              {/* REMOVED */}
              <div className="px-5 py-4 space-y-1.5">
                <p className="text-[9px] tracking-widest text-red-400/80 uppercase">REMOVED</p>
                {removed().map((item) => (
                  <p key={item} className="text-red-300/60">
                    <span className="text-red-400">{'- '}</span>
                    {item}
                  </p>
                ))}
              </div>

              {/* ADDED */}
              <div className="px-5 py-4 space-y-1.5">
                <p className="text-[9px] tracking-widest text-emerald-400/80 uppercase">ADDED</p>
                {added().map((item) => (
                  <p key={item} className="text-emerald-300/70">
                    <span className="text-emerald-400">{'+ '}</span>
                    {item}
                  </p>
                ))}
              </div>

              {/* KNOWN ISSUES */}
              <div className="px-5 py-4 space-y-1.5">
                <p className="text-[9px] tracking-widest text-amber-400/80 uppercase">
                  {m.talk_ld_patch_known_label()}
                </p>
                {known().map((item) => (
                  <p key={item} className="text-amber-300/60">
                    <span className="text-amber-400">{'! '}</span>
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  )
}
