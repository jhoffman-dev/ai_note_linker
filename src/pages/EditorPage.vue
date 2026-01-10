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
            <div class="q-pa-sm text-center text-h6">Backlinks</div>
            <!-- backlinks list -->
          </div>
        </template>
      </q-splitter>
    </div>
  </q-page>
</template>

<script>
import { EditorContent, Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { useNotesStore } from 'src/stores/notes-store'
import { mapState, mapActions } from 'pinia'

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
    ...mapState(useNotesStore, ['currentNote', 'notes', 'loading']),
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
        }
      },
    },
  },

  mounted() {
    this.editor = new Editor({
      content: this.currentNote?.content || '<p>Untitled</p>',
      extensions: [StarterKit, Markdown],
      editorProps: {
        attributes: {
          spellcheck: 'false',
        },
      },
      onUpdate: ({ editor }) => {
        if (this.currentNote) {
          const html = editor.getHTML()
          this.currentNote.content = html

          // Extract title from first line
          const text = editor.getText()
          const firstLine = text.split('\n')[0].trim()
          this.currentNote.title = firstLine || 'Untitled'

          // Debounced save
          this.debounceSave()
        }
      },
    })

    this.loadNotes()
  },

  beforeUnmount() {
    // Save before leaving
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    if (this.currentNote) {
      this.saveCurrent()
    }
    if (this.editor) {
      this.editor.destroy()
    }
  },

  methods: {
    ...mapActions(useNotesStore, ['loadNotes', 'openNote', 'saveCurrent']),

    debounceSave() {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }
      this.saveTimeout = setTimeout(() => {
        this.saveCurrent()
      }, 1000)
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
  overflow: auto;
}
</style>
