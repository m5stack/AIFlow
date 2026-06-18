import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'vibe:theme'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode
}

function applyTheme(resolved: 'light' | 'dark'): void {
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.classList.toggle('dark', resolved === 'dark')
  document.body.classList.toggle('dark', resolved === 'dark')
}

interface ThemeStore {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  initialize: () => void
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: 'system',
  resolved: 'dark',

  initialize: () => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    const mode: ThemeMode =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    const resolved = resolveTheme(mode)
    applyTheme(resolved)
    set({ mode, resolved })

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => {
      if (get().mode !== 'system') return
      const next = resolveTheme('system')
      applyTheme(next)
      set({ resolved: next })
    }
    media.addEventListener('change', onChange)
  },

  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode)
    const resolved = resolveTheme(mode)
    applyTheme(resolved)
    set({ mode, resolved })
  },

  toggle: () => {
    const next = get().resolved === 'dark' ? 'light' : 'dark'
    get().setMode(next)
  }
}))
