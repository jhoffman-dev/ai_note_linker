import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { ipcMain } from 'electron'
import {
  getNote,
  listNotes,
  upsertNote,
  getBacklinks,
  getAllLinks,
  updateNoteLinks,
  updateTasks,
  getAllTasks,
  getTasksForNote,
  toggleTaskChecked,
  toggleNoteFavorite,
} from './db/index.js'

export function registerIpcHandlers() {
  ipcMain.handle('notes:list', () => listNotes())
  ipcMain.handle('notes:get', (_evt, id) => getNote(id))
  ipcMain.handle('notes:upsert', (_evt, note) => upsertNote(note))
  ipcMain.handle('notes:getBacklinks', (_evt, noteId) => getBacklinks(noteId))
  ipcMain.handle('notes:getAllLinks', () => getAllLinks())
  ipcMain.handle('notes:updateLinks', (_evt, fromId, toIds, source) =>
    updateNoteLinks(fromId, toIds, source),
  )
  ipcMain.handle('notes:toggleFavorite', (_evt, noteId) => toggleNoteFavorite(noteId))
  ipcMain.handle('tasks:update', (_evt, noteId, tasks) => updateTasks(noteId, tasks))
  ipcMain.handle('tasks:getAll', (_evt, checkedFilter) => getAllTasks(checkedFilter))
  ipcMain.handle('tasks:getForNote', (_evt, noteId) => getTasksForNote(noteId))
  ipcMain.handle('tasks:toggle', (_evt, taskId) => toggleTaskChecked(taskId))
}

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

const currentDir = fileURLToPath(new URL('.', import.meta.url))

let mainWindow

async function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
  })

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

registerIpcHandlers()

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
