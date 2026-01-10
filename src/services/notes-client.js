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
}
