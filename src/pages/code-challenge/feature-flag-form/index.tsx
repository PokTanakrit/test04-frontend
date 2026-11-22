import { Flag } from 'lucide-react'
import ThemeToggle from '#/components/theme-toggle'
import FeatureFlagEditor from './your-codes'

function FeatureFlagForm() {
  return (
    <div className="min-h-screen bg-muted/45 text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-700 text-white dark:bg-teal-400 dark:text-teal-950">
              <Flag className="size-4" aria-hidden="true" />
            </span>
            Feature Flags
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
        <FeatureFlagEditor />
      </main>
    </div>
  )
}

export default FeatureFlagForm
