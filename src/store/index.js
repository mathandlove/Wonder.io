import { createStore } from 'vuex';
import axios from 'axios';
import Book10 from '../assets/Books/book10/book.json';

// const resource_uri = 'https://localhost:49161/book';
const resource_uri = 'https://wonder-stories-api.web.app/book';

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
    Scores: JSON.parse(localStorage.getItem('Scores')) || [
      {
        id: 0, name: 'Jane Doe', OldScore: 0, NewScore: 0,
      },
      {
        id: 1, name: 'BotName1', OldScore: 0, NewScore: 0,
      },
      {
        id: 2, name: 'BotName2', OldScore: 0, NewScore: 0,
      },
      {
        id: 3, name: 'BotName3', OldScore: 0, NewScore: 0,
      },
    ],
  },
  mutations: {
    SET_BOOK_LIST(state, event) {
      state.BookArray = event;
      localStorage.setItem('BookArray', event);
    },
    SET_GRADE_BOOK_ORDER(state, event) {
      state.GradeBookOrder = event;
      localStorage.setItem('GradeBookOrder', event);
    },
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
    SET_USER_NAME(state, event) {
      state.Scores[event.id].name = event.name;
      localStorage.setItem('Scores', JSON.stringify(state.Scores));
    },
    SET_USER_SCORE_ADD(state, event) {
      state.Scores[event.id].OldScore = state.Scores[event.id].NewScore;
      state.Scores[event.id].NewScore += event.add;
      localStorage.setItem('Scores', JSON.stringify(state.Scores));
    },
    CLEAR_SCORES(state) {
      for (let i = 0; i <= 3; i += 1) {
        state.Scores[i].OldScore = 0;
        state.Scores[i].NewScore = 0;
      }
      localStorage.setItem('Scores', JSON.stringify(state.Scores));
    },
  },
  actions: {
    async fetchGradeFilters({ commit }) {
      const response = await axios.get(resource_uri + '/gradefilters');
      commit('SET_GRADE_BOOK_ORDER',response.data);
    },
    async setBookList({ commit }) {
      
      const resposne = await axios.get(resource_uri);
      commit('SET_BOOK_LIST', resposne.data);
    },
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
    setUserName({ commit }, newNameInfo) {
      commit('SET_USER_NAME', newNameInfo);
    },
    setUserScoreAdd({ commit }, newScoreAdd) {
      commit('SET_USER_SCORE_ADD', newScoreAdd);
    },
    ClearScores({ commit }) {
      commit('CLEAR_SCORES');
    },
  },
  modules: {
  },
});
