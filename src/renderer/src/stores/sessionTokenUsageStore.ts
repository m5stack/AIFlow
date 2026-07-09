import { create } from 'zustand'
import type { ChatTokenUsage } from '../types/project'
import { totalTokensFromUsage } from '../utils/conversation/formatTokenUsage'

interface SessionTokenUsageState {
  totalTokens: number
  addUsage: (usage: ChatTokenUsage) => void
}

export const useSessionTokenUsageStore = create<SessionTokenUsageState>((set) => ({
  totalTokens: 0,
  addUsage: (usage) => {
    const delta = totalTokensFromUsage(usage)
    if (delta <= 0) return
    set((state) => ({ totalTokens: state.totalTokens + delta }))
  }
}))
