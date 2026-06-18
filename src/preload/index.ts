import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AgentActivityEvent,
  AgentErrorEvent,
  AgentFilesChangedEvent,
  AgentMessageEvent,
  AgentPermissionRequest,
  AgentPermissionResponse,
  AgentRewindParams,
  AgentRewindResult,
  AgentStartTurnParams,
  AgentTurnCompleteEvent,
  ChatMessage,
  ChatMessageRunStatus,
  CreateUserModelConfigPayload,
  CreateProjectPayload,
  LegacyProjectPayload,
  ProjectConversation,
  ProjectFileContent,
  ProjectFileNode,
  ProjectItem,
  SerialPortInfo,
  UserModelConfig,
  UpdateUserModelConfigPayload
} from '../shared/types'
import type { BundledFirmwareInfo } from '../shared/bundledFirmware'
import type { IpcAPI } from './ipcApi'

const ipc: IpcAPI = {
  project: {
    list(): Promise<ProjectItem[]> {
      return ipcRenderer.invoke('project:list')
    },
    create(payload: CreateProjectPayload): Promise<ProjectItem> {
      return ipcRenderer.invoke('project:create', payload)
    },
    migrateFromLegacy(projects: LegacyProjectPayload[]): Promise<ProjectItem[]> {
      return ipcRenderer.invoke('project:migrateFromLegacy', projects)
    },
    rename(projectId: string, name: string): Promise<ProjectItem> {
      return ipcRenderer.invoke('project:rename', projectId, name)
    },
    delete(projectId: string): Promise<void> {
      return ipcRenderer.invoke('project:delete', projectId)
    },
    readFile(projectId: string, filePath: string): Promise<ProjectFileContent> {
      return ipcRenderer.invoke('project:readFile', projectId, filePath)
    },
    writeFile(projectId: string, filePath: string, content: string): Promise<void> {
      return ipcRenderer.invoke('project:writeFile', projectId, filePath, content)
    },
    createFile(projectId: string, filePath: string, content?: string): Promise<ProjectFileNode[]> {
      return ipcRenderer.invoke('project:createFile', projectId, filePath, content)
    },
    importResourceFile(
      projectId: string,
      filePath: string,
      base64Data: string
    ): Promise<ProjectFileNode[]> {
      return ipcRenderer.invoke('project:importResourceFile', projectId, filePath, base64Data)
    },
    readFileDataUrl(projectId: string, filePath: string): Promise<string> {
      return ipcRenderer.invoke('project:readFileDataUrl', projectId, filePath)
    },
    deleteFile(projectId: string, filePath: string): Promise<ProjectFileNode[]> {
      return ipcRenderer.invoke('project:deleteFile', projectId, filePath)
    },
    addConversation(projectId: string): Promise<ProjectConversation> {
      return ipcRenderer.invoke('project:addConversation', projectId)
    },
    deleteConversation(projectId: string, convId: string): Promise<void> {
      return ipcRenderer.invoke('project:deleteConversation', projectId, convId)
    },
    renameConversation(
      projectId: string,
      convId: string,
      title: string
    ): Promise<ProjectConversation> {
      return ipcRenderer.invoke('project:renameConversation', projectId, convId, title)
    },
    appendConversationMessages(
      projectId: string,
      convId: string,
      messages: ChatMessage[]
    ): Promise<ProjectConversation> {
      return ipcRenderer.invoke('project:appendConversationMessages', projectId, convId, messages)
    },
    setTurnDuration(
      projectId: string,
      convId: string,
      userMessageId: string,
      durationMs: number
    ): Promise<ProjectConversation> {
      return ipcRenderer.invoke(
        'project:setTurnDuration',
        projectId,
        convId,
        userMessageId,
        durationMs
      )
    },
    setTurnRunStatus(
      projectId: string,
      convId: string,
      userMessageId: string,
      runStatus: ChatMessageRunStatus
    ): Promise<ProjectConversation> {
      return ipcRenderer.invoke(
        'project:setTurnRunStatus',
        projectId,
        convId,
        userMessageId,
        runStatus
      )
    },
    setActiveDevice(projectId: string, deviceId?: string): Promise<ProjectItem> {
      return ipcRenderer.invoke('project:setActiveDevice', projectId, deviceId)
    }
  },
  agent: {
    startTurn(params: AgentStartTurnParams): Promise<{ turnId: string }> {
      return ipcRenderer.invoke('agent:startTurn', params)
    },
    respondPermission(response: AgentPermissionResponse): Promise<void> {
      return ipcRenderer.invoke('agent:respondPermission', response)
    },
    interrupt(convId: string): Promise<void> {
      return ipcRenderer.invoke('agent:interrupt', convId)
    },
    rewindFiles(params: AgentRewindParams): Promise<AgentRewindResult> {
      return ipcRenderer.invoke('agent:rewindFiles', params)
    },
    onMessage(callback: (event: AgentMessageEvent) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, payload: AgentMessageEvent): void =>
        callback(payload)
      ipcRenderer.on('agent:message', listener)
      return () => ipcRenderer.removeListener('agent:message', listener)
    },
    onActivity(callback: (event: AgentActivityEvent) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, payload: AgentActivityEvent): void =>
        callback(payload)
      ipcRenderer.on('agent:activity', listener)
      return () => ipcRenderer.removeListener('agent:activity', listener)
    },
    onPermission(callback: (event: AgentPermissionRequest) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, payload: AgentPermissionRequest): void =>
        callback(payload)
      ipcRenderer.on('agent:permission', listener)
      return () => ipcRenderer.removeListener('agent:permission', listener)
    },
    onFilesChanged(callback: (event: AgentFilesChangedEvent) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, payload: AgentFilesChangedEvent): void =>
        callback(payload)
      ipcRenderer.on('agent:filesChanged', listener)
      return () => ipcRenderer.removeListener('agent:filesChanged', listener)
    },
    onTurnComplete(callback: (event: AgentTurnCompleteEvent) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, payload: AgentTurnCompleteEvent): void =>
        callback(payload)
      ipcRenderer.on('agent:turnComplete', listener)
      return () => ipcRenderer.removeListener('agent:turnComplete', listener)
    },
    onError(callback: (event: AgentErrorEvent) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, payload: AgentErrorEvent): void =>
        callback(payload)
      ipcRenderer.on('agent:error', listener)
      return () => ipcRenderer.removeListener('agent:error', listener)
    }
  },
  model: {
    list(): Promise<UserModelConfig[]> {
      return ipcRenderer.invoke('model:list')
    },
    create(payload: CreateUserModelConfigPayload): Promise<UserModelConfig> {
      return ipcRenderer.invoke('model:create', payload)
    },
    update(modelId: string, payload: UpdateUserModelConfigPayload): Promise<UserModelConfig> {
      return ipcRenderer.invoke('model:update', modelId, payload)
    },
    delete(modelId: string): Promise<void> {
      return ipcRenderer.invoke('model:delete', modelId)
    }
  },
  serial: {
    onPortList(callback: (ports: SerialPortInfo[]) => void): () => void {
      const listener = (_event: Electron.IpcRendererEvent, ports: SerialPortInfo[]): void =>
        callback(ports)
      ipcRenderer.on('serial:port-list', listener)
      return () => ipcRenderer.removeListener('serial:port-list', listener)
    },
    selectPort(portId: string): void {
      ipcRenderer.send('serial:port-selected', portId)
    },
    offPortList(): void {
      ipcRenderer.removeAllListeners('serial:port-list')
    }
  },
  firmware: {
    generateNvsFromCsv(csvText: string, size: number | string): Promise<Uint8Array> {
      return ipcRenderer.invoke('firmware:generateNvsFromCsv', csvText, size)
    },
    getBundledInfo(): Promise<BundledFirmwareInfo> {
      return ipcRenderer.invoke('firmware:getBundledInfo')
    },
    readBundled(): Promise<Uint8Array> {
      return ipcRenderer.invoke('firmware:readBundled')
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('ipc', ipc)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.ipc = ipc
}
