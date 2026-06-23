import { create } from 'zustand'

const CLIENT_ID_STORAGE_KEY = 'vibe:deviceTempId'

const sanitizeClientId = (value: string): string => value.replace(/-/g, '')

const createClientId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return sanitizeClientId(crypto.randomUUID())
  }
  return `temp${Date.now()}${Math.floor(Math.random() * 1000000)}`
}

const getOrCreateClientId = (): string => {
  const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY)
  if (existing) {
    const sanitized = sanitizeClientId(existing)
    if (sanitized !== existing) {
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, sanitized)
    }
    return sanitized
  }
  const next = createClientId()
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, next)
  return next
}

const persistClientId = (clientId: string): void => {
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId)
}

interface ClientIdStoreState {
  clientId: string
  bootstrap: () => Promise<void>
}

export const useClientIdStore = create<ClientIdStoreState>((set, get) => ({
  clientId: getOrCreateClientId(),
  bootstrap: async () => {
    try {
      const persisted = await window.ipc.clientId.get()
      const current = get().clientId
      if (persisted) {
        const sanitized = sanitizeClientId(persisted)
        if (sanitized !== current) {
          persistClientId(sanitized)
          set({ clientId: sanitized })
        }
        return
      }
      await window.ipc.clientId.set(current)
    } catch {
      // keep current value on IPC failure
    }
  }
}))

export const bootstrapClientId = (): Promise<void> => useClientIdStore.getState().bootstrap()
