import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { setupPrinterIPC } from './printer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      devTools: true, // Explicitly enable DevTools
    },
  })

  // Open DevTools in development mode
  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools()
  }

  // Enable F12 and other DevTools shortcuts
  win.webContents.on('before-input-event', (_event, input) => {
    // F12 - Toggle DevTools
    if (input.key === 'F12') {
      if (win?.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools()
      } else {
        win?.webContents.openDevTools()
      }
    }
    // Ctrl+Shift+I - Toggle DevTools
    if (input.control && input.shift && input.key === 'I') {
      if (win?.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools()
      } else {
        win?.webContents.openDevTools()
      }
    }
    // Ctrl+Shift+J - Open DevTools Console
    if (input.control && input.shift && input.key === 'J') {
      win?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Handle window.open for Customer Display
  win.webContents.setWindowOpenHandler(() => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        width: 800,
        height: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.mjs'),
        },
      }
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  setupPrinterIPC()

  ipcMain.handle('show-notification', (_event, { title, body }) => {
    new Notification({ title, body }).show()
  })
})
