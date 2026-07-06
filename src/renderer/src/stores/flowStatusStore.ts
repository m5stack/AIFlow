import { create } from 'zustand'

export type FlowDeviceStatus = 'idle' | 'running' | 'success' | 'failed'

interface FlowStatusState {
  talk: boolean
  ai: boolean
  code: boolean
  device: FlowDeviceStatus

  setTalk: (active: boolean) => void
  setAi: (active: boolean) => void
  pulseCode: () => void
  setDevice: (status: FlowDeviceStatus) => void
}

let codePulseTimer: number | undefined
const CODE_GLOW_LINGER_MS = 1800

export const useFlowStatusStore = create<FlowStatusState>((set, get) => ({
  talk: false,
  ai: false,
  code: false,
  device: 'idle',

  setTalk: (active) => {
    set((state) => {
      const next: Partial<FlowStatusState> = { talk: active }
      if (active && (state.device === 'success' || state.device === 'failed')) {
        next.device = 'idle'
      }
      return next
    })
  },

  setAi: (active) => {
    if (get().ai === active) return
    set({ ai: active })
  },

  pulseCode: () => {
    set({ code: true })
    if (codePulseTimer) window.clearTimeout(codePulseTimer)
    codePulseTimer = window.setTimeout(() => {
      codePulseTimer = undefined
      set({ code: false })
    }, CODE_GLOW_LINGER_MS)
  },

  setDevice: (status) => {
    if (get().device === status) return
    set({ device: status })
  }
}))
