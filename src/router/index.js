import { createRouter, createWebHistory } from 'vue-router';
import Home from '../pages/Home.vue';
import Books from '../pages/BooksList.vue';
import Book from '../pages/Book.vue';
import BookLanding from '../pages/BookLanding.vue';
import Tcr from '../pages/Tcr.vue';
import TcrIntro from '../pages/TcrIntro.vue';
import TcrLetterQuiz from '../pages/TcrLetterQuiz.vue';
import TcrLibrary from '../pages/TcrLibrary.vue';
import TcrGameDescription from '../pages/TcrGameDescription.vue';

// SEO Landing Pages
const InteractiveBooksForKids = () => import('../pages/landing/InteractiveBooksForKids.vue');
const InteractiveStoriesForKids = () => import('../pages/landing/InteractiveStoriesForKids.vue');
const FreeInteractiveBooks = () => import('../pages/landing/FreeInteractiveBooks.vue');
const BooksForKidsWithAdhd = () => import('../pages/landing/BooksForKidsWithAdhd.vue');
const BooksForKidsWithDyslexia = () => import('../pages/landing/BooksForKidsWithDyslexia.vue');

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: 'Welcome to Wonder.io' },
  },
  {
    path: '/book/:id',
    name: 'BookLanding',
    component: BookLanding,
    meta: { title: 'Wonder.io - Book' },
    props: true,
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
    path: '/interactive-books-for-kids',
    name: 'InteractiveBooksForKids',
    component: InteractiveBooksForKids,
    meta: { title: 'Interactive Books for Kids | Wonder.io' },
  },
  {
    path: '/interactive-stories-for-kids',
    name: 'InteractiveStoriesForKids',
    component: InteractiveStoriesForKids,
    meta: { title: 'Interactive Stories for Kids | Wonder.io' },
  },
  {
    path: '/free-interactive-books',
    name: 'FreeInteractiveBooks',
    component: FreeInteractiveBooks,
    meta: { title: 'Free Interactive Books for Kids | Wonder.io' },
  },
  {
    path: '/books-for-kids-with-adhd',
    name: 'BooksForKidsWithAdhd',
    component: BooksForKidsWithAdhd,
    meta: { title: 'Books for Kids with ADHD | Wonder.io' },
  },
  {
    path: '/books-for-kids-with-dyslexia',
    name: 'BooksForKidsWithDyslexia',
    component: BooksForKidsWithDyslexia,
    meta: { title: 'Books for Kids with Dyslexia | Wonder.io' },
  },
  {
    path: '/tcr',
    name: 'Toddlers Can Read',
    component: Tcr,
    meta: { title: 'Toddlers Can Read Prototype' },
  },
  {
    path: '/tcr/intro',
    name: 'Introduction',
    component: TcrIntro,
    meta: { title: 'Toddlers Can Read Prototype' },
    props: true,
  },
  {
    path: '/tcr/quiz',
    name: 'Letter Quiz',
    component: TcrLetterQuiz,
    meta: { title: 'Toddlers Can Read Prototype' },
  },
  {
    path: '/tcr/library',
    name: 'Library',
    component: TcrLibrary,
    meta: { title: 'Toddlers Can Read Prototype' },
  },
  {
    path: '/tcr/game',
    name: 'Game',
    component: TcrGameDescription,
    meta: { title: 'Toddlers Can Read Prototype' },
    props: true 
  },





];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

// eslint-disable-next-line consistent-return
router.beforeEach((to, from, next) => {


  //This changes the title.

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

// Signal to prerenderer that the page is ready after meta tags and content load
router.afterEach(() => {
  setTimeout(() => {
    document.dispatchEvent(new Event('__RENDERED__'));
  }, 1000);
});

export default router;
