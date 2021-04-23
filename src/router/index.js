import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Books from '../pages/BooksList.vue';
import Book from '../pages/Book.vue';
import Like from '../pages/Like.vue';
import ScoreBoard from '../pages/ScoreBoard.vue';
import Join from '../pages/Join.vue';
import Celebration from '../pages/Celebration.vue';
import Transition from '../pages/Transition.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: 'Welcome to Wonder.io' },
  },
  {
    path: '/book/:id/:page',
    name: 'Book',
    component: Book,
    meta: { title: 'Wonder.io - Book' },
    props: true,
  },
  {
    path: '/books',
    name: 'Books',
    component: Books,
    meta: { title: 'Wonder.io - Books' },
  },
  {
    path: '/like',
    name: 'Like',
    component: Like,
    meta: { title: 'Wonder.io - Like' },
  },
  {
    path: '/scoreboard',
    name: 'Scoreboard',
    component: ScoreBoard,
    meta: { title: 'Wonder.io - Scoreboard' },
    props: true,
  },
  {
    path: '/join',
    name: 'Join',
    component: Join,
    meta: { title: 'Wonder.io - Join' },
  },
  {
    path: '/celebration',
    name: 'Celebration',
    component: Celebration,
    meta: { title: 'Wonder.io - Celebration' },
  },
  {
    path: '/transition',
    name: 'Transition',
    component: Transition,
    meta: { title: 'Wonder.io - Transition' },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// eslint-disable-next-line consistent-return
router.beforeEach((to, from, next) => {
  // This goes through the matched routes from last to first, finding the closest route with a title
  // e.g., if we have `/some/deep/nested/route` and `/some`, `/deep`, and `/nested` have titles,
  // `/nested`'s will be chosen.
  const nearestWithTitle = to.matched.slice().reverse().find((r) => r.meta && r.meta.title);

  // Find the nearest route element with meta tags.
  const nearestWithMeta = to.matched.slice().reverse().find((r) => r.meta && r.meta.metaTags);

  // If a route with a title was found, set the document (page) title to that value.
  if (nearestWithTitle) document.title = nearestWithTitle.meta.title;

  // Remove any stale meta tags from the document using the key attribute we set below.
  Array.from(document.querySelectorAll('[data-vue-router-controlled]')).map((el) => el.parentNode.removeChild(el));

  // Skip rendering meta tags if there are none.
  if (!nearestWithMeta) return next();

  // Turn the meta tag definitions into actual elements in the head.
  nearestWithMeta.meta.metaTags.map((tagDef) => {
    const tag = document.createElement('meta');

    Object.keys(tagDef).forEach((key) => {
      tag.setAttribute(key, tagDef[key]);
    });

    // We use this to track which meta tags we create so we don't interfere with other ones.
    tag.setAttribute('data-vue-router-controlled', '');

    return tag;
  })
  // Add the meta tags to the document head.
    .forEach((tag) => document.head.appendChild(tag));

  next();
});

export default router;
