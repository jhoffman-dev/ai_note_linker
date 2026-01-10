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

    CREATE TABLE IF NOT EXISTS note_links (
      from_id TEXT NOT NULL,
      to_id   TEXT NOT NULL,
      source  TEXT NOT NULL, -- 'user_wikilink' | 'ai' (later)
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (from_id, to_id, source)
    );

    CREATE INDEX IF NOT EXISTS idx_note_links_to
      ON note_links(to_id, source);

    CREATE INDEX IF NOT EXISTS idx_note_links_from
      ON note_links(from_id, source);
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

export function getBacklinks(noteId) {
  return getDb()
    .prepare(
      `
    SELECT n.id, n.title, nl.source, nl.updated_at
    FROM note_links nl
    JOIN notes n ON nl.from_id = n.id
    WHERE nl.to_id = ?
    ORDER BY nl.updated_at DESC
  `,
    )
    .all(noteId)
}

export function updateNoteLinks(fromId, toIds, source = 'user_wikilink') {
  const db = getDb()
  const now = Date.now()

  // Start a transaction
  db.exec('BEGIN')

  try {
    // Delete existing links from this note with this source
    db.prepare('DELETE FROM note_links WHERE from_id = ? AND source = ?').run(fromId, source)

    // Insert new links
    const insertStmt = db.prepare(`
      INSERT INTO note_links (from_id, to_id, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const toId of toIds) {
      insertStmt.run(fromId, toId, source, now, now)
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
