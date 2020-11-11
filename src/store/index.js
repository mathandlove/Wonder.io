import { createStore } from 'vuex';
import Book1 from '../assets/Books/book1/book.json';
import Book2 from '../assets/Books/book2/book.json';
import Book3 from '../assets/Books/book3/book.json';
import Book4 from '../assets/Books/book4/book.json';
import Book5 from '../assets/Books/book5/book.json';

export default createStore({
  state: {
    GradeFilter: 'NONE',
    BookDataArray: [Book1, Book2, Book3, Book4, Book5],
  },
  mutations: {
    SET_GRADE_FILTER(state, event) {
      state.GradeFilter = event;
    },
  },
  actions: {
    setGradeFilter({ commit }, filterValue) {
      commit('SET_GRADE_FILTER', filterValue);
    },
  },
  modules: {
  },
});
