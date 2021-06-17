import { createStore } from 'vuex';
import axios from 'axios';
import Book10 from '../assets/Books/book10/book.json';
import Book10Item from '../assets/Books/book10/book10item.json';
// const resource_uri = 'https://localhost:44312/book';
const resource_uri = 'https://wonderstories-api-dev-as.azurewebsites.net/book';

export default createStore({
  state: {
    GradeFilter: +localStorage.getItem('GradeFilter') || 'none',
    GradeBookOrder: JSON.parse(localStorage.getItem('GradeBookOrder')) || {
      gradePreK: [10],
      gradeK: [10],
      grade1: [10],
      grade2: [10],
      grade3: [10],
      grade4: [10],
      grade5: [10],
      grade6: [10],
      none: [10],
    },
    WordFilteredBooks: [Book10Item],
    GradeFilteredBookItems: [Book10Item],
    SelectedBookItem: JSON.parse(localStorage.getItem('SelectedBook')) || Book10Item,
    BookData: JSON.parse(localStorage.getItem('BookData')) || Book10,
    BookArray: JSON.parse(localStorage.getItem('BookArray')) || [Book10Item],
    HighestPage: +localStorage.getItem('HighestPage') || 1,
    BookID: +localStorage.getItem('BookID') || 10,
    BookPage: +parseInt(localStorage.getItem('BookPage')) || 1,
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

    questionNumber: 0,

    bookStyle: {
      showPagePill: true,
      showScorePill: false,
      showPrevButton: true,
      showNextButton: true,
      sheetHasLines: false,
      showPagePill: true
    }

  },
  getters: {
    currentBookParagraph: state => {
      let pageNumber = parseInt(state.BookPage);
      return state.BookData.pages[+pageNumber - 1];
    },

    //Needs to be part of server data
    questionNumber: state => {
      return state.questionNumber;
    },

    mainText: state => {
      return state.BookData.pages[state.BookPage - 1].pageParts[0].lineParts[0].words.join(" ")
    },

    pageNumber: state => {
      return state.BookPage;
    },

    totalNumberOfPages: state => {
      return state.BookData.pages.length;
    },

    pageType: state => {
      console.log(state.BookData.pages[state.BookPage - 1])
      return state.BookData.pages[state.BookPage - 1].type;
    },

    playerScore: state => {
      return state.Scores[0].pointsEnd;  //Note, I'm not sure pointsEnd is the right score
    },

    showPagePill: state => {
      return state.bookStyle.showPagePill;
    },

    showScorePill: state => {
      return state.bookStyle.showScorePill;
    },

    showPrevButton: state => {
      return state.bookStyle.showPrevButton;
    },
    showNextButton: state => {
      return state.bookStyle.showNextButton;
    },
    sheetHasLines: state => {
      return state.bookStyle.sheetHasLines;
    },
    coverHREF: state => {
      return state.SelectedBookItem.largeBookCoverImageUrl
    },
    textSeries: state => {
      let textToDisplay = [];
      let combinedLines = "";
      for (let i = 0; i < state.BookData.pages[state.BookPage - 1].pageParts.length; i++) {
        combinedLines = "";
        for (let j = 0; j < state.BookData.pages[state.BookPage - 1].pageParts[i].lineParts.length; j++) {
          combinedLines += state.BookData.pages[state.BookPage - 1].pageParts[i].lineParts[j].words.join(" ");
        }
        textToDisplay.push(combinedLines);
      }
      console.log(textToDisplay)
      return textToDisplay;
    }


  },
  mutations: {
    SET_BOOK_LIST(state, event) {
      state.BookArray = event;
      localStorage.setItem('BookArray', JSON.stringify(state.BookArray));
    },
    SET_GRADE_BOOK_ORDER(state, event) {
      state.GradeBookOrder = event;
      localStorage.setItem('GradeBookOrder', JSON.stringify(state.GradeBookOrder));
    },
    SET_GRADE_FILTER(state, event) {
      state.GradeFilter = event;
      localStorage.setItem('GradeFilter', state.GradeFilter);
    },
    SET_BOOK_DATA(state, event) {
      state.BookData = event;
      localStorage.setItem('BookData', JSON.stringify(state.BookData));
    },
    SET_HIGHEST_PAGE(state, event) {
      state.HighestPage = event;
      localStorage.setItem('HighestPage', event);
    },
    SET_BOOK_ID(state, event) {
      state.BookID = event;
      localStorage.setItem('BookID', event);
    },
    SET_BOOK_ITEM(state, event) {
      state.SelectedBookItem = event;
      localStorage.setItem('SelectedBook', JSON.stringify(state.SelectedBookItem));
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
      let existingFilters = localStorage.getItem('GradeBookOrder');
      if (existingFilters == null) {
        const response = await axios.get(resource_uri + '/gradefilters');
        commit('SET_GRADE_BOOK_ORDER', response.data);
      } else {
        commit('SET_GRADE_BOOK_ORDER', JSON.parse(existingFilters));
      }
    },
    async fetchBookData({ commit }, bookId) {
      const response = await axios.get(resource_uri + `/${bookId}`);
      commit('SET_BOOK_DATA', response.data);
    },
    async setBookList({ commit }) {
      let existingArray = localStorage.getItem('BookArray');
      if (existingArray == null) {
        const response = await axios.get(resource_uri);
        commit('SET_BOOK_LIST', response.data);
      } else {
        commit('SET_BOOK_LIST', JSON.parse(existingArray));
      }
    },
    setBookItem({ commit }, bookItem) {
      commit('SET_BOOK_ITEM', bookItem);
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
      commit('SET_BOOK_PAGE', parseInt(newPage));
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
