import React, { useEffect } from 'react'
import { OnboardingFlow } from './components/onboarding'
import WorkspaceLayout from './components/layout/WorkspaceLayout'
import { useOnboardingStore } from './stores/onboardingStore'
import { flushPendingProjectFileWrite, useProjectStore } from './stores/projectStore'
import { useThemeStore } from './stores/themeStore'

export default function App(): React.JSX.Element {
  const initializeTheme = useThemeStore((state) => state.initialize)
  const isInitialized = useProjectStore((state) => state.isInitialized)
  const maybeAutoOpen = useOnboardingStore((state) => state.maybeAutoOpen)

  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])

  useEffect(() => {
    if (!isInitialized) return
    void maybeAutoOpen()
  }, [isInitialized, maybeAutoOpen])

  useEffect(() => {
    const flush = (): void => {
      flushPendingProjectFileWrite()
    }

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      flush()
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <>
      <WorkspaceLayout />
      <OnboardingFlow />
    </>
  )
}
