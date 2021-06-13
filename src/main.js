import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';



import notebookPage from './components/ux/NotebookPage.vue';
import theBackground from './components/ux/TheBackground.vue';
const app = createApp(App);
app.component('notebook-page', notebookPage)
app.component('the-background', theBackground)


app.use(store).use(router).mount('#app');
