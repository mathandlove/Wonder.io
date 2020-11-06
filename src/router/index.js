import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Books from '../views/BooksList.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/books',
    name: 'Books',
    component: Books,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
