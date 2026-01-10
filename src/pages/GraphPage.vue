<template>
  <q-page class="graph-page">
    <div ref="graphContainer" class="graph-container"></div>
  </q-page>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useNotesStore } from 'src/stores/notes-store'
import { useRouter } from 'vue-router'
import ForceGraph from 'force-graph'

export default {
  name: 'GraphPage',

  setup() {
    const graphContainer = ref(null)
    const notesStore = useNotesStore()
    const router = useRouter()
    let graph = null
    let resizeCleanup = null

    const buildGraphData = async () => {
      const notes = notesStore.notes

      // Create nodes from notes
      const nodes = notes.map((note) => ({
        id: note.id,
        name: note.title || 'Untitled',
        favorite: note.favorite,
      }))

      // Fetch links from the database
      const links = []
      const allLinks = await window.notesApi.getAllLinks?.()

      if (allLinks) {
        allLinks.forEach((link) => {
          links.push({
            source: link.from_id,
            target: link.to_id,
          })
        })
      }

      return { nodes, links }
    }

    onMounted(async () => {
      await notesStore.loadNotes()

      const data = await buildGraphData()

      graph = ForceGraph()(graphContainer.value)
        .graphData(data)
        .nodeLabel('name')
        .nodeColor((node) => (node.favorite === 1 ? '#f59e0b' : '#1b4a8b'))
        .nodeRelSize(6)
        .linkDirectionalArrowLength(6)
        .linkDirectionalArrowRelPos(1)
        .linkColor(() => '#999')
        .linkWidth(1.5)
        .onNodeClick((node) => {
          notesStore.openNote(node.id)
          router.push('/editor')
        })
        .onNodeHover((node) => {
          graphContainer.value.style.cursor = node ? 'pointer' : 'default'
        })
        .width(graphContainer.value.clientWidth)
        .height(graphContainer.value.clientHeight)

      // Handle window resize
      const handleResize = () => {
        if (graph && graphContainer.value) {
          graph.width(graphContainer.value.clientWidth).height(graphContainer.value.clientHeight)
        }
      }
      window.addEventListener('resize', handleResize)

      // Store cleanup function
      resizeCleanup = () => {
        window.removeEventListener('resize', handleResize)
      }
    })

    onBeforeUnmount(() => {
      if (resizeCleanup) {
        resizeCleanup()
      }
      if (graph) {
        graph = null
      }
    })

    return {
      graphContainer,
    }
  },
}
</script>

<style lang="scss" scoped>
.graph-page {
  padding: 0;
  position: relative;
  height: 100vh;
}

.graph-container {
  width: 100%;
  height: 100%;
  background: #fafafa;
}
</style>
