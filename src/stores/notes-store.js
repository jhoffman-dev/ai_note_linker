// src/stores/notesStore.js
import { defineStore } from 'pinia'
import { notesClient } from 'src/services/notes-client'

export const useNotesStore = defineStore('notes', {
  state: () => ({
    notes: [],
    currentNote: null,
    backlinks: [],
    loading: false,
  }),

  actions: {
    async loadNotes() {
      this.loading = true
      try {
        this.notes = await notesClient.list()
      } finally {
        this.loading = false
      }
    },

    async openNote(id) {
      // Save current note before switching
      if (this.currentNote && this.currentNote.id !== id) {
        await this.saveCurrent()
      }
      this.currentNote = await notesClient.get(id)
      // Load backlinks for the opened note
      await this.loadBacklinks(id)
    },

    async createNote() {
      const newNote = {
        id: crypto.randomUUID(),
        title: 'Untitled',
        content: '<p>Untitled</p>',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      this.currentNote = await notesClient.upsert(newNote)
      await this.loadNotes()
      return this.currentNote
    },

    async saveCurrent() {
      if (!this.currentNote) return
      // Serialize to plain object for IPC
      const noteToSave = {
        id: this.currentNote.id,
        title: this.currentNote.title,
        content: this.currentNote.content,
        updated_at: this.currentNote.updated_at,
        created_at: this.currentNote.created_at,
      }
      const saved = await notesClient.upsert(noteToSave)
      this.currentNote = saved

      // Update the note in the list without full reload
      const index = this.notes.findIndex((n) => n.id === saved.id)
      if (index >= 0) {
        this.notes[index] = { id: saved.id, title: saved.title, updated_at: saved.updated_at }
      } else {
        // New note, add to list
        this.notes.unshift({ id: saved.id, title: saved.title, updated_at: saved.updated_at })
      }
    },

    async loadBacklinks(noteId) {
      if (!noteId) return
      this.backlinks = await notesClient.getBacklinks(noteId)
    },

    async updateNoteLinks(fromId, linkedNoteIds) {
      if (!fromId) return
      await notesClient.updateLinks(fromId, linkedNoteIds, 'user_wikilink')
      // Reload backlinks if we're viewing one of the affected notes
      if (this.currentNote) {
        await this.loadBacklinks(this.currentNote.id)
      }
    },
  },
})
