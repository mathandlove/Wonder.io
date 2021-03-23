import { createStore } from 'vuex';
import Book10 from '../assets/Books/book10/book.json';

export default createStore({
  state: {
    GradeFilter: localStorage.getItem('GradeFilter') || 'NONE',
    GradeBookOrder: {
      PreK: [10],
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
    BookID: +localStorage.getItem('BookID') || null,
    BookPage: +localStorage.getItem('BookPage') || 1,
    AspectRatio: +localStorage.getItem('AspectRatio') || 1,
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
    SET_BOOK_ID(state, event) {
      state.BookID = event;
      localStorage.setItem('BookID', event);
    },
    SET_BOOK_PAGE(state, event) {
      state.BookPage = event;
      localStorage.setItem('BookPage', event);
    },
    SET_ASPECT_RATIO(state, event) {
      state.AspectRatio = event;
      localStorage.setItem('AspectRatio', event);
    },
  },
  actions: {
    setGradeFilter({ commit }, filterValue) {
      commit('SET_GRADE_FILTER', filterValue);
    },
    setHighestPage({ commit }, newPage) {
      commit('SET_HIGHEST_PAGE', newPage);
    },
    setBookID({ commit }, newID) {
      commit('SET_BOOK_ID', newID);
    },
    setBookPage({ commit }, newPage) {
      commit('SET_BOOK_PAGE', newPage);
    },
    setAspectRatio({ commit }, newRatio) {
      commit('SET_ASPECT_RATIO', newRatio);
    },
  },
  modules: {
  },
});
