// src/services/notesClient.js
export const notesClient = {
  list() {
    return window.notesApi.list()
  },
  get(id) {
    return window.notesApi.get(id)
  },
  upsert(note) {
    return window.notesApi.upsert(note)
  },
  getBacklinks(noteId) {
    return window.notesApi.getBacklinks(noteId)
  },
  updateLinks(fromId, toIds, source = 'user_wikilink') {
    return window.notesApi.updateLinks(fromId, toIds, source)
  },
}

export const tasksClient = {
  update(noteId, tasks) {
    return window.tasksApi.update(noteId, tasks)
  },
  getAll(checkedFilter = null) {
    return window.tasksApi.getAll(checkedFilter)
  },
  getForNote(noteId) {
    return window.tasksApi.getForNote(noteId)
  },
  toggle(taskId) {
    return window.tasksApi.toggle(taskId)
  },
}
