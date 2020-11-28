import { createStore } from 'vuex';
import Book10 from '../assets/Books/book10/book.json';

export default createStore({
  state: {
    GradeFilter: localStorage.getItem('GradeFilter') || 'NONE',
    GradeBookOrder: {
      PRE: [10],
      K: [10],
      1: [10],
      2: [10],
      3: [10],
      4: [10],
      5: [10],
      6: [10],
      NONE: [10],
    },
    BookArray: [1, 2, 3, 4, 5, 6, 7, 8, 9, Book10],
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
