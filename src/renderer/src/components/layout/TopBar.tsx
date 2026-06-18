import React from 'react'
import logoDark from '../../assets/m5logo-white.svg'
import logoLight from '../../assets/m5logo2022.svg'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { useThemeStore } from '../../stores/themeStore'
import { QuestionCircleIcon } from '../icons/Icons'
import ProjectSwitcher from '../project/ProjectSwitcher'
import ThemeToggle from '../theme/ThemeToggle'

interface TopBarProps {
  onNewProject: () => void
}

export default function TopBar({ onNewProject }: TopBarProps): React.JSX.Element {
  const resolved = useThemeStore((s) => s.resolved)
  const openOnboarding = useOnboardingStore((s) => s.open)
  const logo = resolved === 'dark' ? logoDark : logoLight

  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-5 px-2">
      <div className="flex min-w-0 flex-col">
        <div className="flex shrink-0 items-center gap-2.5" aria-label="AI-FLOW">
          <img src={logo} alt="M5Stack" className="h-8 w-auto object-contain" />
          <span className="h-8 w-0.5 shrink-0 bg-muted mx-1" aria-hidden="true" />
          <div className="flex items-baseline font-black italic">
            <span className="text-[32px] leading-none">AI</span>
            <span className="text-[22px] leading-none">-FLOW</span>
          </div>
          <span className="rounded-full bg-accent-bg px-2 py-0.5 text-[10px] font-semibold text-accent">
            beta
          </span>
        </div>
        <p className="shrink-0 text-[10px] text-muted">
          Powered by{' '}
          <a
            href="https://m5stack.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors hover:text-ink"
          >
            M5Stack
          </a>
        </p>
      </div>

      <div className="flex justify-center">
        <ProjectSwitcher onNewProject={onNewProject} />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2.5">
        <button
          type="button"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-line bg-surface-2 text-muted transition-colors hover:text-ink"
          title="Getting started guide"
          aria-label="Getting started guide"
          onClick={openOnboarding}
        >
          <QuestionCircleIcon size={14} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
