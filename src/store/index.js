import { createStore } from 'vuex';

export default createStore({
  state: {
    BookFilter: '',
  },
  mutations: {
    SET_BOOK_FILTER(state, event) {
      state.BookFilter = event;
    },
  },
  actions: {
    setBookFilter({ commit }, filterValue) {
      commit('SET_BOOK_FILTER', filterValue);
    },
  },
  modules: {
  },
});
