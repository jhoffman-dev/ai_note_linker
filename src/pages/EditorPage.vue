<template>
  <q-page class="editor-page">
    <div class="splitter-container">
      <q-splitter
        v-model="splitterModel"
        horizontal
        :limits="[20, 80]"
        separator-class="bg-grey-5"
        separator-style="height: 2px; cursor: row-resize;"
        class="tmp-color"
      >
        <template #before>
          <div class="pane">
            <editor-content :editor="editor" class="editor-content" />
          </div>
        </template>

        <template #after>
          <div class="pane backlinks">
            <div class="backlinks-header q-pa-sm">
              <div class="text-h6">Backlinks</div>
              <div class="text-caption text-grey-6">
                {{ backlinks.length }}
                {{ backlinks.length === 1 ? 'note links' : 'notes link' }} here
              </div>
            </div>
            <q-scroll-area class="backlinks-list">
              <q-list v-if="backlinks.length > 0">
                <q-item
                  v-for="backlink in backlinks"
                  :key="backlink.id"
                  clickable
                  v-ripple
                  @click="openNote(backlink.id)"
                >
                  <q-item-section>
                    <q-item-label>{{ backlink.title || 'Untitled' }}</q-item-label>
                    <q-item-label caption>
                      <q-badge
                        :color="backlink.source === 'user_wikilink' ? 'blue' : 'green'"
                        :label="backlink.source"
                      />
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-else class="q-pa-md text-center text-grey-6">No backlinks yet</div>
            </q-scroll-area>
          </div>
        </template>
      </q-splitter>
    </div>
  </q-page>
</template>

<script>
import { EditorContent, Editor } from '@tiptap/vue-3'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import CodeBlock from '@tiptap/extension-code-block'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Blockquote from '@tiptap/extension-blockquote'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import HardBreak from '@tiptap/extension-hard-break'
import Dropcursor from '@tiptap/extension-dropcursor'
import Gapcursor from '@tiptap/extension-gapcursor'
import History from '@tiptap/extension-history'
import { Markdown } from '@tiptap/markdown'
import { useNotesStore } from 'src/stores/notes-store'
import { mapState, mapActions } from 'pinia'
import { Wikilink } from 'src/extensions/Wikilink.js'
import wikilinkSuggestion from 'src/extensions/wikilinkSuggestion.js'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import 'tippy.js/dist/tippy.css'
import MarkdownIt from 'markdown-it'
import markdownItTaskLists from 'markdown-it-task-lists'

const md = new MarkdownIt()
md.use(markdownItTaskLists, { enabled: true })

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      editor: null,
      splitterModel: 60,
      saveTimeout: null,
      previousNoteId: null,
    }
  },

  computed: {
    ...mapState(useNotesStore, ['currentNote', 'notes', 'loading', 'backlinks']),
  },

  watch: {
    'currentNote.id': {
      async handler(newId, oldId) {
        // Save the previous note before switching
        if (oldId && oldId !== newId) {
          await this.saveCurrent()
        }

        if (this.editor && this.currentNote) {
          this.editor.commands.setContent(this.currentNote.content || '<p>Untitled</p>')
          this.updateWikilinks()
          // Sync task states from database after content is loaded
          await this.syncTasksFromDatabase()
        }
      },
    },
    notes: {
      handler() {
        // Update wikilinks when note titles change
        if (this.editor) {
          this.updateWikilinks()
        }
      },
      deep: true,
    },
  },

  mounted() {
    const notesStore = useNotesStore()

    this.editor = new Editor({
      content: this.currentNote?.content || '<p>Untitled</p>',
      extensions: [
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Strike,
        Code,
        CodeBlock,
        Heading,
        Blockquote,
        HorizontalRule,
        HardBreak,
        Dropcursor,
        Gapcursor,
        History,
        TaskList,
        TaskItem.configure({
          nested: true,
          HTMLAttributes: {
            class: 'task-item',
          },
        }),
        // Regular lists after task lists
        ListItem,
        BulletList.configure({
          keepMarks: true,
          keepAttributes: false,
        }),
        OrderedList.configure({
          keepMarks: true,
          keepAttributes: false,
        }),
        Markdown.configure({
          html: true,
          transformPastedText: true,
          transformCopiedText: false,
        }),
        Wikilink.configure({
          suggestion: wikilinkSuggestion,
          HTMLAttributes: {
            class: 'wikilink',
          },
        }),
      ],
      editorProps: {
        attributes: {
          spellcheck: 'false',
        },
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData('text/plain')
          if (!text) return false

          // Check if it looks like markdown
          const hasMarkdown = /([*_#`[\]~]|^[-+*]\s|^\d+\.\s)/m.test(text)
          if (hasMarkdown) {
            event.preventDefault()

            // Convert task list markdown syntax to just [ ] so TipTap can handle it
            const processedText = text.replace(/^(\s*)[-+*]\s+(\[[xX ]\])/gm, '$1$2')

            // Convert markdown to HTML
            const html = md.render(processedText)

            // Use the editor instance to insert content
            this.editor.commands.insertContent(html)
            return true
          }

          return false
        },
        handleClickOn: (view, pos, node, nodePos, event) => {
          if (node.type.name === 'wikilink') {
            event.preventDefault()
            const noteId = node.attrs.id
            if (noteId) {
              this.openNote(noteId)
            }
            return true
          }
          return false
        },
      },
      onUpdate: ({ editor, transaction }) => {
        if (this.currentNote) {
          const html = editor.getHTML()
          this.currentNote.content = html

          // Extract title from first line
          const text = editor.getText()
          const firstLine = text.split('\n')[0].trim()
          this.currentNote.title = firstLine || 'Untitled'

          // Check if the transaction modified any taskItem nodes
          let taskChanged = false
          transaction.steps.forEach((step) => {
            if (step.jsonID === 'replace' || step.jsonID === 'replaceAround') {
              const { from, to } = step
              transaction.docs[0].nodesBetween(from, to, (node) => {
                if (node.type.name === 'taskItem') {
                  taskChanged = true
                }
              })
            }
          })

          // If a task changed, save immediately without debouncing
          if (taskChanged) {
            this.extractAndSaveTasks()
          }

          // Debounced save for content
          this.debounceSave()
        }
      },
    })

    // Store the notes store in editor storage for the wikilink extension
    this.editor.storage.wikilink = {
      notesStore,
    }

    this.loadNotes()

    // Sync tasks from database on mount if there's a current note
    if (this.currentNote) {
      this.$nextTick(() => {
        this.syncTasksFromDatabase()
      })
    }
  },

  activated() {
    // Sync tasks when returning to this view (e.g., from tasks list)
    if (this.editor && this.currentNote) {
      this.syncTasksFromDatabase()
    }
  },

  beforeUnmount() {
    // Save before leaving
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    if (this.currentNote) {
      this.saveCurrent()
      this.extractAndSaveWikilinks()
      this.extractAndSaveTasks()
    }
    if (this.editor) {
      this.editor.destroy()
    }
  },

  methods: {
    ...mapActions(useNotesStore, [
      'loadNotes',
      'openNote',
      'saveCurrent',
      'updateNoteLinks',
      'updateNoteTasks',
      'loadTasksForNote',
    ]),

    debounceSave() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }
      this.saveTimeout = setTimeout(async () => {
        await this.saveCurrent()
        // Extract and save wikilinks after saving content
        this.extractAndSaveWikilinks()
        // Extract and save tasks after saving content
        this.extractAndSaveTasks()
      }, 1000)
    },

    extractAndSaveWikilinks() {
      if (!this.editor || !this.currentNote) return

      const linkedNoteIds = []
      this.editor.state.doc.descendants((node) => {
        if (node.type.name === 'wikilink' && node.attrs.id) {
          linkedNoteIds.push(node.attrs.id)
        }
      })

      // Update the links in the database
      this.updateNoteLinks(this.currentNote.id, linkedNoteIds)
    },

    extractAndSaveTasks() {
      if (!this.editor || !this.currentNote) return

      const tasks = []
      let position = 0

      this.editor.state.doc.descendants((node) => {
        if (node.type.name === 'taskItem') {
          const content = node.textContent.trim()
          const checked = node.attrs.checked || false

          tasks.push({
            content,
            checked,
            position: position++,
          })
        }
      })

      // Update tasks in the database (IDs and checked state will be preserved by matching content)
      this.updateNoteTasks(this.currentNote.id, tasks)
    },

    updateWikilinks() {
      if (!this.editor) return

      // Update wikilink labels based on current note titles
      const { state } = this.editor
      const { tr } = state
      let modified = false

      state.doc.descendants((node, pos) => {
        if (node.type.name === 'wikilink') {
          const noteId = node.attrs.id
          const note = this.notes.find((n) => n.id === noteId)
          if (note) {
            const newLabel = note.title || 'Untitled'
            if (node.attrs.label !== newLabel) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                label: newLabel,
              })
              modified = true
            }
          }
        }
      })

      if (modified) {
        this.editor.view.dispatch(tr)
      }
    },

    async syncTasksFromDatabase() {
      if (!this.editor || !this.currentNote) return

      // Load tasks from database for current note
      const dbTasks = await this.loadTasksForNote(this.currentNote.id)
      if (!dbTasks || dbTasks.length === 0) return

      // Create a map of content -> checked state
      const taskStateMap = new Map()
      for (const task of dbTasks) {
        taskStateMap.set(task.content, !!task.checked)
      }

      // Update taskItem nodes in the editor to match database state
      const { state } = this.editor
      const { tr } = state
      let modified = false

      state.doc.descendants((node, pos) => {
        if (node.type.name === 'taskItem') {
          const content = node.textContent.trim()
          const dbChecked = taskStateMap.get(content)

          if (dbChecked !== undefined && node.attrs.checked !== dbChecked) {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              checked: dbChecked,
            })
            modified = true
          }
        }
      })

      if (modified) {
        this.editor.view.dispatch(tr)
      }
    },
  },
}
</script>

<style lang="scss">
.editor-wrapper {
  display: flex;
  flex-direction: column;
  margin: 10px;
  // border: 1px solid var(--gray-3);
  // border-radius: 0.5rem;
}
.tiptap {
  padding: 5px;
  border: none;
  outline: none;

  :first-child {
    margin-top: 0;
  }

  /* List styles */
  ul,
  ol {
    padding: 0 1rem;
    margin: 1rem 1rem 1rem 0.4rem;

    li p {
      margin-top: 0.25em;
      margin-bottom: 0.25em;
    }
  }

  /* Heading styles */
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    line-height: 1.1;
    margin-top: 1rem;
    text-wrap: pretty;
  }

  h1,
  h2 {
    margin-top: 2.5rem;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 1.8rem;
    font-weight: bold;
  }

  h2 {
    font-size: 1.4rem;
    font-weight: bold;
  }

  h3 {
    font-size: 1.2rem;
    font-weight: bold;
  }

  h4,
  h5,
  h6 {
    font-size: 1rem;
    font-weight: bold;
  }

  b,
  strong {
    // font-size: 2rem;
    font-weight: bold;
    color: #1b4a8b;
  }

  /* Code and preformatted text styles */
  code {
    background-color: var(--purple-light);
    border-radius: 0.4rem;
    color: var(--black);
    font-size: 0.85rem;
    padding: 0.25em 0.3em;
  }

  pre {
    background: var(--black);
    border-radius: 0.5rem;
    color: var(--white);
    font-family: 'JetBrainsMono', monospace;
    margin: 1.5rem 0;
    padding: 0.75rem 1rem;

    code {
      background: none;
      color: inherit;
      font-size: 0.8rem;
      padding: 0;
    }
  }

  mark {
    background-color: #1b4a8b;
    border-radius: 0.4rem;
    box-decoration-break: clone;
    padding: 0.1rem 0.3rem;
  }

  blockquote {
    border: 2px solid #1b4a8b;
    border-radius: 5px;
    background-color: #1b4a8b3f;
    margin: 1.5rem 0;
    padding: 1rem;
  }

  hr {
    border: none;
    border-top: 1.2px solid #1b4a8b;
    margin: 2rem 2rem;
  }

  /* Wikilink styles */
  span[data-type='wikilink'] {
    color: #1b4a8b;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    padding: 0 2px;

    &:hover {
      background-color: #1b4a8b1a;
    }
  }

  /* Task list styles */
  ul[data-type='taskList'] {
    list-style: none;
    padding-left: 0;

    li {
      display: flex;
      align-items: flex-start;

      > label {
        flex: 0 0 auto;
        margin-right: 0.5rem;
        user-select: none;
        margin-top: 0.25rem;
      }

      > div {
        flex: 1 1 auto;
      }
    }

    input[type='checkbox'] {
      cursor: pointer;
      width: 1.2em;
      height: 1.2em;
    }

    p {
      margin: 0;
    }
  }
}

/* Critical flex/min-height chain so splitter + panes can stretch and scroll */
.editor-page {
  padding: 0;
  position: relative;
}

.splitter-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.splitter-container .q-splitter {
  height: 100%;
}

.pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-content {
  flex: 1;
  overflow: auto;
  padding: 10px;
}

/* Make the actual ProseMirror editor stretch nicely */
.editor-content :deep(.ProseMirror) {
  min-height: 100%;
  outline: none;
}

.backlinks {
  display: flex;
  flex-direction: column;
}

.backlinks-header {
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.backlinks-list {
  flex: 1;
  height: 100%;
}
</style>
