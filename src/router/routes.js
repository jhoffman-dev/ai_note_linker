const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'editor', component: () => import('pages/EditorPage.vue') },
      { path: 'tasks', component: () => import('pages/TasksPage.vue') },
      { path: 'graph', component: () => import('pages/GraphPage.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
