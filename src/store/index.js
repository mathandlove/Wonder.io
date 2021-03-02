import { createStore } from 'vuex';
import Book10 from '../assets/Books/book10/book10old2.json';

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
    HighestPage: +localStorage.getItem('HighestPage') || 1,
  },
  mutations: {
    SET_GRADE_FILTER(state, event) {
      state.GradeFilter = event;
      localStorage.setItem('GradeFilter', event);
    },
    SET_HIGHEST_PAGE(state, event) {
      state.HighestPage = event;
      localStorage.setItem('HighestPage', event);
    },
  },
  actions: {
    setGradeFilter({ commit }, filterValue) {
      commit('SET_GRADE_FILTER', filterValue);
    },
    setHighestPage({ commit }, newPage) {
      commit('SET_HIGHEST_PAGE', newPage);
    },
  },
  modules: {
  },
});
