import { VueRenderer } from '@tiptap/vue-3'
import tippy from 'tippy.js'
import WikilinkList from './WikilinkList.vue'

export default {
  items: ({ query, editor }) => {
    const notesStore = editor.storage.wikilink?.notesStore
    if (!notesStore) return []

    const notes = notesStore.notes || []

    return notes
      .filter((note) => {
        const label = note.title || 'Untitled'
        return label.toLowerCase().includes(query.toLowerCase())
      })
      .slice(0, 10)
      .map((note) => ({
        id: note.id,
        label: note.title || 'Untitled',
      }))
  },

  command: ({ editor, range, props }) => {
    // Insert the wikilink node
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent([
        {
          type: 'wikilink',
          attrs: {
            id: props.id,
            label: props.label,
            exists: true, // Items from the list always exist
          },
        },
        {
          type: 'text',
          text: ' ',
        },
      ])
      .run()
  },

  allow: ({ state, range }) => {
    const $from = state.doc.resolve(range.from)
    const type = state.schema.nodes.wikilink
    if (!type) return false
    const allow = !!$from.parent.type.contentMatch.matchType(type)
    return allow
  },

  render: () => {
    let component
    let popup

    return {
      onStart: (props) => {
        component = new VueRenderer(WikilinkList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0].hide()
          return true
        }

        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
