<template>
  <q-page class="tasks-page q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h4 q-mr-md">Tasks</div>
      <q-toggle v-model="hideCompleted" label="Hide completed" color="primary" />
    </div>

    <q-list bordered separator v-if="filteredTasks.length > 0">
      <q-item
        v-for="task in filteredTasks"
        :key="task.id"
        clickable
        @click="openNoteFromTask(task.note_id)"
      >
        <q-item-section side>
          <q-checkbox
            :model-value="!!task.checked"
            @update:model-value="toggleTask(task.id)"
            @click.stop
            color="primary"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label :class="{ 'text-strike': task.checked }">
            {{ task.content }}
          </q-item-label>
          <q-item-label caption>
            <q-icon name="description" size="xs" />
            {{ task.note_title }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else class="text-center text-grey-6 q-mt-xl">
      <q-icon name="check_circle" size="64px" />
      <div class="text-h6 q-mt-md">No tasks found</div>
    </div>
  </q-page>
</template>

<script>
import { useNotesStore } from 'src/stores/notes-store'
import { mapState, mapActions } from 'pinia'

export default {
  name: 'TasksPage',

  data() {
    return {
      hideCompleted: false,
    }
  },

  computed: {
    ...mapState(useNotesStore, ['tasks']),

    filteredTasks() {
      if (this.hideCompleted) {
        return this.tasks.filter((task) => !task.checked)
      }
      return this.tasks
    },
  },

  async mounted() {
    await this.loadAllTasks()
  },

  methods: {
    ...mapActions(useNotesStore, ['loadAllTasks', 'openNote', 'toggleTask']),

    async openNoteFromTask(noteId) {
      await this.openNote(noteId)
      this.$router.push('/editor')
    },
  },
}
</script>

<style lang="scss" scoped>
.tasks-page {
  max-width: 900px;
  margin: 0 auto;
}

.text-strike {
  text-decoration: line-through;
  opacity: 0.6;
}
</style>
