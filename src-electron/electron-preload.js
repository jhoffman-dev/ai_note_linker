/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.js you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('notesApi', {
  list: () => ipcRenderer.invoke('notes:list'),
  get: (id) => ipcRenderer.invoke('notes:get', id),
  upsert: (note) => ipcRenderer.invoke('notes:upsert', note),
  getBacklinks: (noteId) => ipcRenderer.invoke('notes:getBacklinks', noteId),
  getAllLinks: () => ipcRenderer.invoke('notes:getAllLinks'),
  updateLinks: (fromId, toIds, source) =>
    ipcRenderer.invoke('notes:updateLinks', fromId, toIds, source),
  toggleFavorite: (noteId) => ipcRenderer.invoke('notes:toggleFavorite', noteId),
})

contextBridge.exposeInMainWorld('tasksApi', {
  update: (noteId, tasks) => ipcRenderer.invoke('tasks:update', noteId, tasks),
  getAll: (checkedFilter) => ipcRenderer.invoke('tasks:getAll', checkedFilter),
  getForNote: (noteId) => ipcRenderer.invoke('tasks:getForNote', noteId),
  toggle: (taskId) => ipcRenderer.invoke('tasks:toggle', taskId),
})
