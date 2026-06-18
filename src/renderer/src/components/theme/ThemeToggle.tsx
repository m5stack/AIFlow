import React from 'react'
import { MoonIcon, SunIcon } from '../icons/Icons'
import { useThemeStore } from '../../stores/themeStore'

export default function ThemeToggle(): React.JSX.Element {
  const resolved = useThemeStore((s) => s.resolved)
  const toggle = useThemeStore((s) => s.toggle)

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-line bg-surface-2 text-muted transition-colors hover:text-ink"
      aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={resolved === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {resolved === 'dark' ? <SunIcon size={14} /> : <MoonIcon size={14} />}
    </button>
  )
}
