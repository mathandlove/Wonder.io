import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import VueGtag from "vue-gtag";





const app = createApp(App);



app.use(store).use(router).use(VueGtag, {
    config: { id: "G-VS6MMJL9FY" }
  }).mount('#app');
