import { createStore } from 'vuex';
import Book1 from '../assets/Books/book1/book.json';
import Book2 from '../assets/Books/book2/book.json';
import Book3 from '../assets/Books/book3/book.json';
import Book4 from '../assets/Books/book4/book.json';
import Book5 from '../assets/Books/book5/book.json';

export default createStore({
  state: {
    GradeFilter: localStorage.getItem('GradeFilter') || 'NONE',
    GradeBookOrder: {
      PRE: [1, 2, 3, 4, 5],
      K: [1, 4, 2, 5, 3],
      1: [2, 3, 4, 5, 1],
      2: [2, 1, 5, 4, 3],
      3: [3, 5, 4, 2, 1],
      4: [3, 2, 1, 4, 5],
      5: [4, 5, 1, 2, 3],
      6: [4, 3, 1, 5, 4],
      NONE: [5, 4, 3, 2, 1],
    },
    BookArray: [Book1, Book2, Book3, Book4, Book5],
  },
  mutations: {
    SET_GRADE_FILTER(state, event) {
      state.GradeFilter = event;
      localStorage.setItem('GradeFilter', event);
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
