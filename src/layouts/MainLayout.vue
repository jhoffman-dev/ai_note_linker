<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> AI Note Linker </q-toolbar-title>

        <div>AI Note Linker v0.0.1</div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Essential Links </q-item-label>
        <q-item clickable v-ripple @click="homeClick">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section> Home </q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="editorClick">
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section> Editor </q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="tasksClick">
          <q-item-section avatar>
            <q-icon name="checklist" />
          </q-item-section>
          <q-item-section> Tasks </q-item-section>
        </q-item>
        <q-separator spaced />

        <q-item-label header> Notes </q-item-label>
        <q-scroll-area class="notes-list">
          <q-item
            v-for="note in notes"
            :key="note.id"
            clickable
            v-ripple
            @click="selectNote(note.id)"
            :active="currentNote?.id === note.id"
          >
            <q-item-section>
              <q-item-label>{{ note.title || 'Untitled' }}</q-item-label>
              <q-item-label caption>{{ formatDate(note.updated_at) }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="notes.length === 0 && !loading">
            <q-item-section class="text-grey-6 text-center"> No notes yet </q-item-section>
          </q-item>
          <q-item v-if="loading">
            <q-item-section class="text-center">
              <q-spinner size="sm" />
            </q-item-section>
          </q-item>
        </q-scroll-area>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />

      <!-- <q-page-sticky position="bottom-right" :offset="['20px', '20px']">
          <q-btn fab icon="add" color="accent" @click="() => {}" />
        </q-page-sticky> -->
      <q-btn fab icon="add" color="accent" class="fab-global" @click="createNewNote" />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotesStore } from 'src/stores/notes-store'
import { useQuasar } from 'quasar'

const router = useRouter()
const notesStore = useNotesStore()
const $q = useQuasar()

const notes = computed(() => notesStore.notes)
const currentNote = computed(() => notesStore.currentNote)
const loading = computed(() => notesStore.loading)

function homeClick() {
  router.push('/')
}

function editorClick() {
  router.push('/editor')
}

function tasksClick() {
  router.push('/tasks')
}

async function selectNote(id) {
  await notesStore.openNote(id)
  router.push('/editor')

  // Close drawer on smaller screens
  if ($q.screen.lt.md) {
    leftDrawerOpen.value = false
  }
}

async function createNewNote() {
  await notesStore.createNote()
  router.push('/editor')

  // Close drawer on smaller screens
  if ($q.screen.lt.md) {
    leftDrawerOpen.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

onMounted(() => {
  notesStore.loadNotes()
})
</script>

<style lang="scss">
.fab-global {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2000;
}

.notes-list {
  height: calc(100vh - 250px);
}
</style>
