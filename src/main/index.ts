import { app, shell, BrowserWindow, Menu, screen } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { registerAgentIpc } from './ipc/agentIpc'
import { registerClientIdIpc } from './ipc/clientIdIpc'
import { registerModelIpc } from './ipc/modelIpc'
import { registerFirmwareIpc } from './ipc/firmwareIpc'
import { registerProjectIpc } from './ipc/projectIpc'
import { registerSerialIpc, registerSerialPortSelectedIpc } from './ipc/serialIpc'
import { registerSkillIpc } from './ipc/skillIpc'
import { registerTokenUsageIpc } from './ipc/tokenUsageIpc'
import { registerMcpIpc } from './ipc/mcpIpc'
import { ClientIdService } from './services/clientIdService'
import { McpService } from './services/mcpService'
import { ProjectService } from './services/projectService'
import { SkillService } from './services/skillService'
import { TokenUsageService } from './services/tokenUsageService'
import { UserModelService } from './services/userModelService'

// Enable Web Serial API
app.commandLine.appendSwitch('enable-features', 'WebSerial')

/** Matches workspace lg breakpoint (3-column layout + flow bar). */
const WINDOW_MIN_WIDTH = 1060
const WINDOW_MIN_HEIGHT = 640

/** Design baseline; zoom keeps the CSS viewport aligned to this canvas. */
const BASE_DESIGN_WIDTH = 1440
const BASE_DESIGN_HEIGHT = 900

async function createWindow(
  projectService: ProjectService,
  userModelService: UserModelService,
  skillService: SkillService,
  mcpService: McpService,
  tokenUsageService: TokenUsageService
): Promise<void> {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    show: true,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      enableBlinkFeatures: 'WebSerial'
    }
  })

  const applyZoom = (): void => {
    if (mainWindow.isDestroyed()) return
    const [contentWidth, contentHeight] = mainWindow.getContentSize()
    if (contentWidth <= 0 || contentHeight <= 0) return

    const isBelowBaseline =
      contentWidth < BASE_DESIGN_WIDTH || contentHeight < BASE_DESIGN_HEIGHT

    // Below baseline: scale down to fit. At or above baseline: no zoom (layout fills naturally).
    const zoom = isBelowBaseline
      ? Math.min(contentWidth / BASE_DESIGN_WIDTH, contentHeight / BASE_DESIGN_HEIGHT)
      : 1
    mainWindow.webContents.setZoomFactor(Math.min(Math.max(zoom, 0.5), 4))
  }

  mainWindow.on('ready-to-show', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    if (width < BASE_DESIGN_WIDTH || height < BASE_DESIGN_HEIGHT) {
      mainWindow.maximize()
    }
    applyZoom()
  })

  mainWindow.webContents.on('did-finish-load', applyZoom)
  mainWindow.on('resize', applyZoom)
  mainWindow.on('maximize', applyZoom)
  mainWindow.on('unmaximize', applyZoom)
  mainWindow.on('enter-full-screen', applyZoom)
  mainWindow.on('leave-full-screen', applyZoom)
  if (process.env['OPEN_DEVTOOLS'] === '1') {
    mainWindow.webContents.openDevTools()
  }
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  registerAgentIpc(mainWindow, projectService, userModelService, mcpService, tokenUsageService)
  registerSkillIpc(mainWindow, skillService, projectService)

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Allow Web Serial API permission requests
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      if ((permission as string) === 'serial') callback(true)
      else callback(false)
    }
  )

  // Required: grant device-level access for Web Serial API
  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') return true
    return false
  })

  registerSerialIpc(mainWindow)
}

app.whenReady().then(() => {
  // Prevent macOS menu crash: representedObject is not a WeakPtrToElectronMenuModelAsNSObject
  Menu.setApplicationMenu(null)

  // Set the macOS Dock icon (only relevant in dev; packaged builds use the .icns).
  if (process.platform === 'darwin') {
    app.dock?.setIcon(icon)
  }
  const skillService = new SkillService()
  const projectService = new ProjectService(undefined, skillService)
  const userModelService = new UserModelService()
  const mcpService = new McpService()
  const clientIdService = new ClientIdService()
  const tokenUsageService = new TokenUsageService()
  registerProjectIpc(projectService)
  registerModelIpc(userModelService)
  registerMcpIpc(mcpService)
  registerClientIdIpc(clientIdService)
  registerTokenUsageIpc(tokenUsageService)
  registerFirmwareIpc()
  registerSerialPortSelectedIpc()

  createWindow(projectService, userModelService, skillService, mcpService, tokenUsageService)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(projectService, userModelService, skillService, mcpService, tokenUsageService)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
