<template>
  <!-- <q-page class="full-height">
    <editor-content :editor="editor" class="full-height editor-wrapper" />
  </q-page> -->
  <editor-content :editor="editor" class="full-height editor-wrapper" />
</template>

<script>
import { EditorContent, Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      editor: null,
    }
  },

  mounted() {
    this.editor = new Editor({
      content: "<p>I'm running Tiptap with Vue.js. 🎉</p>",
      extensions: [StarterKit, Markdown],
    })
  },

  beforeUnmount() {
    if (this.editor) {
      this.editor.destroy()
    }
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
</style>
