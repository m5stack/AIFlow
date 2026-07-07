import { create } from 'zustand'

export type FlowDeviceStatus = 'idle' | 'running' | 'success' | 'failed'

interface FlowStatusState {
  talk: boolean
  ai: boolean
  code: boolean
  codeFocused: boolean
  device: FlowDeviceStatus

  setTalk: (active: boolean) => void
  setAi: (active: boolean) => void
  setCodeFocus: (focused: boolean) => void
  pulseCode: () => void
  setDevice: (status: FlowDeviceStatus) => void
}

let codePulseTimer: number | undefined
const CODE_GLOW_LINGER_MS = 3000

export const useFlowStatusStore = create<FlowStatusState>((set, get) => ({
  talk: false,
  ai: false,
  code: false,
  codeFocused: false,
  device: 'idle',

  setTalk: (active) => {
    if (get().talk === active) return
    set({ talk: active })
  },

  setAi: (active) => {
    if (get().ai === active) return
    set({ ai: active })
  },

  setCodeFocus: (focused) => {
    if (get().codeFocused === focused) return
    if (codePulseTimer) {
      window.clearTimeout(codePulseTimer)
      codePulseTimer = undefined
    }
    set({ codeFocused: focused, code: focused })
  },

  pulseCode: () => {
    set({ code: true })
    if (codePulseTimer) window.clearTimeout(codePulseTimer)
    if (get().codeFocused) return
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
