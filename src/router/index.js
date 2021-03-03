import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Books from '../pages/BooksList.vue';
import Book from '../pages/Book.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/book/:id/:page',
    name: 'Book',
    component: Book,
    props: true,
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
