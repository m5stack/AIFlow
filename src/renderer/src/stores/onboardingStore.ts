import { create } from 'zustand'
import { useProjectStore } from './projectStore'

const ONBOARDING_COMPLETED_KEY = 'vibe:onboardingCompleted'

const isOnboardingCompleted = (): boolean =>
  localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true'

const markOnboardingCompleted = (): void => {
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
}

export type OnboardingStep = 0 | 1 | 2 | 3

interface OnboardingStoreState {
  isOpen: boolean
  step: OnboardingStep
  open: () => void
  close: () => void
  complete: () => void
  setStep: (step: OnboardingStep) => void
  maybeAutoOpen: () => Promise<void>
}

export const useOnboardingStore = create<OnboardingStoreState>((set) => ({
  isOpen: false,
  step: 0,

  open: () => set({ isOpen: true, step: 0 }),

  close: () => set({ isOpen: false }),

  complete: () => {
    markOnboardingCompleted()
    set({ isOpen: false, step: 0 })
  },

  setStep: (step) => set({ step }),

  maybeAutoOpen: async () => {
    if (isOnboardingCompleted()) return

    const projects = useProjectStore.getState().projects
    if (projects.length > 0) return

    try {
      const models = await window.ipc.model.list()
      if (models.length > 0) return
      set({ isOpen: true, step: 0 })
    } catch {
      // If model list fails, still show onboarding for first-time setup.
      set({ isOpen: true, step: 0 })
    }
  }
}))
