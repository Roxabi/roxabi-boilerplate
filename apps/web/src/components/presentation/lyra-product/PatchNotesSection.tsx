import { AnimatedSection } from '@repo/ui'
import { m } from '@/paraglide/messages'

export function PatchNotesSection() {
  return (
    <div className="relative mx-auto max-w-4xl w-full">
      <div className="relative">
        <AnimatedSection>
          <h2 className="text-4xl font-bold tracking-tight lg:text-5xl mb-6 font-mono text-amber-300">
            {m.talk_lp_patch_title()}
          </h2>
        </AnimatedSection>

        <AnimatedSection className="mt-4">
          <div className="relative overflow-hidden rounded-xl border border-amber-400/30 bg-black/40 max-w-xl font-mono">
            {/* Changelog header */}
            <div className="border-b border-amber-400/20 px-5 py-3">
              <span className="text-[11px] text-amber-400 tracking-wider">
                {m.talk_lp_patch_version()}
              </span>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* REMOVED */}
              <div>
                <p className="text-[9px] text-rose-400/80 uppercase tracking-widest mb-2">
                  {m.talk_lp_patch_removed_label()}
                </p>
                <ul className="space-y-1">
                  <li className="flex items-start gap-2 text-sm text-rose-300/70">
                    <span className="text-rose-400 mt-0.5">−</span>
                    <span>{m.talk_lp_patch_removed1()}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-rose-300/70">
                    <span className="text-rose-400 mt-0.5">−</span>
                    <span>{m.talk_lp_patch_removed2()}</span>
                  </li>
                </ul>
              </div>

              {/* ADDED */}
              <div>
                <p className="text-[9px] text-amber-400/80 uppercase tracking-widest mb-2">
                  {m.talk_lp_patch_added_label()}
                </p>
                <ul className="space-y-1">
                  <li className="flex items-start gap-2 text-sm text-amber-300/70">
                    <span className="text-amber-400 mt-0.5">+</span>
                    <span>{m.talk_lp_patch_added1()}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-amber-300/70">
                    <span className="text-amber-400 mt-0.5">+</span>
                    <span>{m.talk_lp_patch_added2()}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-amber-300/70">
                    <span className="text-amber-400 mt-0.5">+</span>
                    <span>{m.talk_lp_patch_added3()}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection className="mt-8">
          <blockquote className="max-w-xl border-l-2 border-amber-500/40 pl-4">
            <p className="text-lg font-semibold text-amber-200/90 italic leading-snug">
              &ldquo;{m.talk_lp_patch_insight()}&rdquo;
            </p>
          </blockquote>
        </AnimatedSection>
      </div>
    </div>
  )
}
