import { Node, mergeAttributes } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'
import { InputRule } from '@tiptap/core'

export const WikilinkPluginKey = new PluginKey('wikilink')

export const Wikilink = Node.create({
  name: 'wikilink',

  group: 'inline',

  inline: true,

  selectable: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        char: '[[',
        allowSpaces: true,
        startOfLine: false,
        pluginKey: WikilinkPluginKey,
        items: () => [],
        render: () => ({}),
        command: () => {},
        allow: () => true,
      },
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {}
          }
          return {
            'data-id': attributes.id,
          }
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {}
          }
          return {
            'data-label': attributes.label,
          }
        },
      },
      exists: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-exists') !== 'false',
        renderHTML: (attributes) => {
          return {
            'data-exists': attributes.exists,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="wikilink"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': 'wikilink' }, this.options.HTMLAttributes, HTMLAttributes, {
        onclick: `(function(e) {
            e.preventDefault();
            e.stopPropagation();
            const id = e.target.getAttribute('data-id');
            const label = e.target.getAttribute('data-label');
            const exists = e.target.getAttribute('data-exists') !== 'false';
            window.wikilinkClick && window.wikilinkClick(id, label, exists);
          })(event)`,
      }),
      `[[${node.attrs.label}]]`,
    ]
  },

  renderText({ node }) {
    return `[[${node.attrs.label}]]`
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isWikilink = false
          const { selection } = state
          const { empty, anchor } = selection

          if (!empty) {
            return false
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isWikilink = true
              tr.insertText('[[' + node.attrs.label, pos, pos + 1)
              return false
            }
          })

          return isWikilink
        }),
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+)\]\]$/,
        handler: ({ state, range, match }) => {
          const { tr } = state
          const label = match[1]

          // Check if a note with this title exists
          const notesStore = this.editor.storage.wikilink?.notesStore
          let noteId = null
          let exists = false

          if (notesStore) {
            const matchingNote = notesStore.notes.find((n) => (n.title || 'Untitled') === label)
            if (matchingNote) {
              noteId = matchingNote.id
              exists = true
            }
          }

          const start = range.from
          const end = range.to

          tr.replaceWith(
            start,
            end,
            this.type.create({
              id: noteId,
              label: label,
              exists: exists,
            }),
          )
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})
