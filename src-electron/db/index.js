// src-electron/db/index.js
import path from 'path'
import Database from 'better-sqlite3'
import { app } from 'electron'

let db

export function getDb() {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'dfai.db')
  db = new Database(dbPath)

  // very first migration (keep it dead simple)
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
  `)

  return db
}

export function listNotes() {
  return getDb().prepare('SELECT id, title, updated_at FROM notes ORDER BY updated_at DESC').all()
}

export function upsertNote(note) {
  const now = Date.now()
  getDb()
    .prepare(
      `
    INSERT INTO notes (id, title, content, updated_at)
    VALUES (@id, @title, @content, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      content=excluded.content,
      updated_at=excluded.updated_at
  `,
    )
    .run({ ...note, updated_at: now })
  return { ...note, updated_at: now }
}

export function getNote(id) {
  return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id)
}
