import { create } from 'zustand'
import type { PromptTemplate } from '../../../shared/types'

interface PromptTemplateStoreState {
  templates: PromptTemplate[]
  isLoaded: boolean
  isLoading: boolean
  loadTemplates: () => Promise<void>
  upsertTemplate: (template: PromptTemplate) => void
  removeTemplate: (templateId: string) => void
}

export const usePromptTemplateStore = create<PromptTemplateStoreState>((set, get) => ({
  templates: [],
  isLoaded: false,
  isLoading: false,

  loadTemplates: async () => {
    if (get().isLoaded || get().isLoading) return
    set({ isLoading: true })
    try {
      const templates = await window.ipc.promptTemplate.list()
      set({ templates, isLoaded: true })
    } finally {
      set({ isLoading: false })
    }
  },

  upsertTemplate: (template) => {
    set((state) => {
      const exists = state.templates.some((item) => item.id === template.id)
      return {
        templates: exists
          ? state.templates.map((item) => (item.id === template.id ? template : item))
          : [template, ...state.templates]
      }
    })
  },

  removeTemplate: (templateId) => {
    set((state) => ({
      templates: state.templates.filter((template) => template.id !== templateId)
    }))
  }
}))
