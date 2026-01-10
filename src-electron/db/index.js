// src-electron/db/index.js
import path from 'path'
import Database from 'better-sqlite3'
import { app } from 'electron'
import crypto from 'crypto'

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

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      content TEXT NOT NULL,
      checked INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_note_id ON tasks(note_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_checked ON tasks(checked);
  `)

  // Check if favorite column exists and add it if it doesn't
  const tableInfo = db.prepare("PRAGMA table_info(notes)").all()
  const hasFavoriteColumn = tableInfo.some(col => col.name === 'favorite')

  if (!hasFavoriteColumn) {
    db.exec(`ALTER TABLE notes ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;`)
    db.exec(`CREATE INDEX idx_notes_favorite ON notes(favorite);`)
  }

  return db
}

export function listNotes() {
  return getDb()
    .prepare(
      'SELECT id, title, updated_at, favorite FROM notes ORDER BY favorite DESC, updated_at DESC',
    )
    .all()
}

export function upsertNote(note) {
  const now = Date.now()
  getDb()
    .prepare(
      `
    INSERT INTO notes (id, title, content, updated_at, favorite)
    VALUES (@id, @title, @content, @updated_at, COALESCE(@favorite, 0))
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      content=excluded.content,
      updated_at=excluded.updated_at,
      favorite=COALESCE(excluded.favorite, notes.favorite)
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

export function getAllLinks() {
  return getDb()
    .prepare('SELECT from_id, to_id, source FROM note_links')
    .all()
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

export function updateTasks(noteId, tasks) {
  const db = getDb()
  const now = Date.now()

  db.exec('BEGIN')

  try {
    // Get existing tasks to preserve IDs and checked states
    const existingTasks = db
      .prepare('SELECT id, content, checked FROM tasks WHERE note_id = ?')
      .all(noteId)

    // Create a map of content -> existing task for matching
    const existingMap = new Map()
    for (const task of existingTasks) {
      existingMap.set(task.content, task)
    }

    // Delete existing tasks for this note
    db.prepare('DELETE FROM tasks WHERE note_id = ?').run(noteId)

    // Insert new tasks, preserving IDs and checked state when content matches
    const insertStmt = db.prepare(`
      INSERT INTO tasks (id, note_id, content, checked, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const task of tasks) {
      const existing = existingMap.get(task.content)
      const taskId = existing ? existing.id : crypto.randomUUID()
      const checked = task.checked ? 1 : 0

      insertStmt.run(taskId, noteId, task.content, checked, task.position, now, now)
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export function getAllTasks(checkedFilter = null) {
  const db = getDb()
  let query = `
    SELECT t.*, n.title as note_title
    FROM tasks t
    JOIN notes n ON t.note_id = n.id
  `

  if (checkedFilter !== null) {
    query += ' WHERE t.checked = ?'
    return db.prepare(query + ' ORDER BY t.updated_at DESC').all(checkedFilter ? 1 : 0)
  }

  return db.prepare(query + ' ORDER BY t.updated_at DESC').all()
}

export function getTasksForNote(noteId) {
  return getDb().prepare('SELECT * FROM tasks WHERE note_id = ? ORDER BY position').all(noteId)
}

export function toggleTaskChecked(taskId) {
  const db = getDb()
  const now = Date.now()

  db.prepare(
    `
    UPDATE tasks
    SET checked = NOT checked, updated_at = ?
    WHERE id = ?
  `,
  ).run(now, taskId)

  // Return the updated task
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
}

export function toggleNoteFavorite(noteId) {
  const db = getDb()
  const now = Date.now()

  db.prepare(
    `
    UPDATE notes
    SET favorite = NOT favorite, updated_at = ?
    WHERE id = ?
  `,
  ).run(now, noteId)

  // Return the updated note
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId)
}
