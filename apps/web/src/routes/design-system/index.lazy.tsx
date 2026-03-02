import type { ShadcnPreset, ThemeConfig } from '@repo/ui'
import { createLazyFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { m } from '@/paraglide/messages'

import { ColorsSection } from './-components/ColorsSection'
import { ComponentsSection } from './-components/ComponentsSection'
import { CompositionsSection } from './-components/CompositionsSection'
import { SpacingSection } from './-components/SpacingSection'
import { getTabs, TabNavigation } from './-components/TabNavigation'
import { ThemeEditor } from './-components/ThemeEditor'
import { TypographySection } from './-components/TypographySection'
import type { TabId } from './-components/theme-utils'
import { STORAGE_KEY, useDesignSystemTheme } from './-components/theme-utils'

export const Route = createLazyFileRoute('/design-system/')({
  component: DesignSystemPage,
})

// ---------------------------------------------------------------------------
// ThemeScript: Prevents FOUC by reading localStorage and applying theme
// before React hydrates.
// ---------------------------------------------------------------------------

/** @security The entire template literal must not interpolate user-controlled values.
 *  STORAGE_KEY is a hardcoded constant — no dynamic sources are injected. */
function ThemeScript() {
  const script = `
(function() {
  try {
    var raw = localStorage.getItem('${STORAGE_KEY}');
    if (!raw) return;
    var config = JSON.parse(raw);
    if (config && config.radius) {
      document.documentElement.style.setProperty('--radius', config.radius);
    }
    if (config && config.typography) {
      if (config.typography.fontFamily) {
        document.documentElement.style.setProperty('font-family', config.typography.fontFamily);
      }
      if (config.typography.baseFontSize) {
        document.documentElement.style.setProperty('font-size', config.typography.baseFontSize);
      }
    }
  } catch (e) {}
})();
`
  // biome-ignore lint/security/noDangerouslySetInnerHtml: FOUC prevention — STORAGE_KEY is a hardcoded constant, no user data is interpolated
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}

// ---------------------------------------------------------------------------
// Tab Panels
// ---------------------------------------------------------------------------

function TabPanels({ activeTab, config }: { activeTab: TabId; config: ThemeConfig }) {
  return (
    <>
      {activeTab === 'colors' && (
        <div role="tabpanel" id="panel-colors" aria-labelledby="tab-colors">
          <ColorsSection config={config} />
        </div>
      )}
      {activeTab === 'typography' && (
        <div role="tabpanel" id="panel-typography" aria-labelledby="tab-typography">
          <TypographySection config={config} />
        </div>
      )}
      {activeTab === 'spacing' && (
        <div role="tabpanel" id="panel-spacing" aria-labelledby="tab-spacing">
          <SpacingSection config={config} />
        </div>
      )}
      {activeTab === 'components' && (
        <div role="tabpanel" id="panel-components" aria-labelledby="tab-components">
          <ComponentsSection />
        </div>
      )}
      {activeTab === 'compositions' && (
        <div role="tabpanel" id="panel-compositions" aria-labelledby="tab-compositions">
          <CompositionsSection />
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

function DesignSystemPage() {
  const TABS = getTabs()
  const [activeTab, setActiveTab] = useState<TabId>('colors')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const theme = useDesignSystemTheme()

  const handleBaseSelect = useCallback(
    (preset: ShadcnPreset) => theme.applyComposed(preset.name, theme.activeColor),
    [theme.applyComposed, theme.activeColor]
  )
  const handleColorSelect = useCallback(
    (preset: ShadcnPreset | null) => theme.applyComposed(theme.activeBase, preset?.name ?? null),
    [theme.applyComposed, theme.activeBase]
  )
  const handleReset = useCallback(
    () => theme.applyComposed('zinc', null, true),
    [theme.applyComposed]
  )

  return (
    <>
      <ThemeScript />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">{m.ds_title()}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{m.ds_subtitle()}</p>
        </div>
        <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        <TabPanels activeTab={activeTab} config={theme.themeConfig} />
      </main>
      <ThemeEditor
        config={theme.themeConfig}
        onConfigChange={theme.onConfigChange}
        onBaseSelect={handleBaseSelect}
        onColorSelect={handleColorSelect}
        onReset={handleReset}
        activeBase={theme.activeBase}
        activeColor={theme.activeColor}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />
    </>
  )
}
