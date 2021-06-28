import { createStore } from 'vuex';
import axios from 'axios';
import Book10 from '../assets/Books/book10/book.json';
import Book10Item from '../assets/Books/book10/book10item.json';
import router from '../router/index.js'
// const resource_uri = 'https://localhost:5001/book';
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
    BookArray: JSON.parse(localStorage.getItem('BookArray')) || [Book10Item, Book10Item, Book10Item, Book10Item, Book10Item, Book10Item, Book10Item, Book10Item, Book10Item, Book10Item, Book10Item, Book10Item, Book10Item, Book10Item],
    HighestPage: +localStorage.getItem('HighestPage') || 1,
    BookId: +localStorage.getItem('BookId') || 10,
    BookPage: +parseInt(localStorage.getItem('BookPage')) || 1,
    AspectRatio: +localStorage.getItem('AspectRatio') || 1,
    Scores: JSON.parse(localStorage.getItem('Scores')) || [
      {
        id: 0, name: 'Player1', OldScore: 0, NewScore: 0,
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
    //Aaron here a variety of things I need for each page.
    //Also note that some of my Getters actually found somethings in your BookData in case you chage that.

    mainQCText: "The Case of the Bedroom Egg", //Title or Question
    skipNextAmount: 1, //Each page shows next page increase
    totalNumberOfPages: 1,
    author: "",

    nextCoverImageUrl: "", //On the end screen this shows what the next cover of the book down the list
    nextCoverLink: "/book/11/1", //Link that goes to that next book

    //Everything below are the UX variables you do not need to change.
    bookStyle: {
      showPagePill: true,
      showScorePill: false,
      showPrevButton: true,
      showNextButton: true,
      showNotepadClickButton: false,
      sheetHasLines: false,
      showCover: false
    },

    textSeriesRevealed: 1,
    pageMicroType: "read",

    playerName: ''
    //pageMicroType determines that exact state of  the page for example there's a difference between read and read fully

  },
  getters: {
    getAuthor: state => {
      return state.BookData.author;
    },
    getIllustrator: state => {
      return state.BookData.illustrator;
    },
    currentBookParagraph: state => {
      let pageNumber = parseInt(state.BookPage);
      return state.BookData.pages[+pageNumber - 1];
    },
    questionNumber: (state, getters) => {
      return getters.currentBookParagraph.questionNumber;
    },
    chapterNumber: (state, getters) => {
      return getters.currentBookParagraph.chapterNumber;
    },
    mainText: (state, getters) => {
      return getters.currentBookParagraph.pageTitleText;
    },
    questionImageUrl: (state, getters) => {
      const things = getters.currentBookParagraph.pageParts[0].partImageUrl;
      return things;
    },
    totalLinesOnPage: (state, getters) => {
      return getters.currentBookParagraph.pageParts[0].totalLines;
    },
    pageNumber: state => {
      let pageNumber = parseInt(state.BookPage);
      return pageNumber;
    },
    totalNumberOfPages: state => {
      return state.BookData.totalPages;
    },
    pageType: state => {
      let pageNumber = parseInt(state.BookPage);
      return state.BookData.pages[pageNumber - 1].type;
    },
    pageMicroType: state => {
      return state.pageMicroType;
    },

    playerScore: state => {
      return 975;
      return state.Scores[0].NewScore;
    },

    scoreRank: state => {
      //returns "1,2, or 3 - 3 means anything not 1,2"
      return 1;
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
      var pageLineParts = [];
      let pageNumber = parseInt(state.BookPage);
      var array = state.BookData.pages[pageNumber - 1].pageParts;

      for (let index = 0; index < array.length; index++) {
        const element = array[index];
        pageLineParts = pageLineParts.concat(element.lineParts);
      }
      return pageLineParts;
    },
    seriesAllRead: (state, getters) => {
      return getters.textSeries.length <= (state.textSeriesRevealed)
    },
    answerArray: (state, getters) => {
      //Answer Array is an array of answers the student can guess. Please randomize answers.
      let pageNumber = parseInt(state.BookPage);
      let answers = [...state.BookData.pages[pageNumber - 1].pageParts[0].lineParts].splice(1);
      return answers;
    },
    bookStyle: state => {
      return state.bookStyle;
    },
    bookTitle: state => {
      return state.BookData.title;
    },
    nextPage: state => {
      console.log(state.BookPage + state.skipNextAmount)
      return state.BookPage + state.skipNextAmount;
    },
    nextBookHREF: state => {
      return state.nextCoverImageUrl;
    },
    linkToNextBook: state => {
      return state.nextCoverLink;
    },
    isDoublePoints: (state, getters) => {
      var totalQuestions = state.BookData.pages.filter(page => page.questionNumber > 0).length;
      return getters.questionNumber / totalQuestions > .6

    },
    showQuestionImage: (state, getters) => {
      return getters.answerArray[0].lineType == "answerCoords";
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
      state.BookId = event;
      localStorage.setItem('BookId', event);
    },
    SET_BOOK_ITEM(state, event) {
      state.SelectedBookItem = event;
      localStorage.setItem('SelectedBook', JSON.stringify(state.SelectedBookItem));
    },
    SET_BOOK_PAGE(state, event) {
      state.BookPage = event;
      localStorage.setItem('BookPage', event);
      console.log('bp=' + event)
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
    SET_ANSWER_CLICKED(state, index) {
      let pageNumber = parseInt(state.BookPage);
      const selectedItem = [...state.BookData.pages[pageNumber - 1].pageParts[0].lineParts].splice(1)[index];
      selectedItem.clickedOn = true;
      selectedItem.disabled = true;
    },
    SET_CHOICE_CLICKED(state, nextValue) {
      state.skipNextAmount = nextValue;
      console.log('c' + state.skipNextAmount)
    },
    INCREMENT_TEXT_REVEALED(state) {
      state.textSeriesRevealed++;
    },
    SET_PAGE_TYPE(state, type) {
      console.log('microState changed to: ' + type)
      state.pageMicroType = type;
    },
    SET_PLAYER_NAME(state, sPlayerName) {
      if (sPlayerName == "") {
        state.playerName = "Player 1";
      }
      else {
        state.playerName = sPlayerName;
      }
      state.Scores[0].name = state.playerName;
      console.log(state.playerName + 'n' + sPlayerName)
    },

    SET_PAGE_STYLE(state) {
      const type = state.pageMicroType;

      state.bookStyle.showScorePill = true;
      state.bookStyle.showPagePill = true;
      state.bookStyle.showPrevButton = true;
      state.bookStyle.showNextButton = true;
      state.bookStyle.showNotepadClickButton = false;
      state.bookStyle.showCover = false;
      if (type == "questiontitle") {
        state.bookStyle.sheetHasLines = false;
      }
      else if (type == "question") {
        state.bookStyle.sheetHasLines = false;
        state.bookStyle.showNextButton = false;
      }
      else if (type == "questionLoaded") {
        state.bookStyle.sheetHasLines = false;
        state.bookStyle.showNextButton = false;
      }
      else if (type == "failAnimation" || type == "passAnimation") {
        state.bookStyle.sheetHasLines = false;
        state.bookStyle.showNextButton = false;
        state.bookStyle.showPrevButton = false;
      }
      else if (type == "questionAnsweredCorrect") {
        state.bookStyle.sheetHasLines = false;
        state.bookStyle.showPrevButton = true;
        state.bookStyle.showNextButton = true;
        const pageIndex = parseInt(state.BookPage) - 1;
        const answerArray = [...state.BookData.pages[pageIndex].pageParts[0].lineParts].splice(1);
        for (let i = 0; i < answerArray.length; i++) {
          answerArray[i].disabled = true;
        }
      }
      else if (type == "choice") {
        state.bookStyle.sheetHasLines = false;
        state.bookStyle.showNextButton = false;
      }
      else if (type == "read") {
        state.bookStyle.sheetHasLines = true;
        state.bookStyle.showNotepadClickButton = true;
        state.bookStyle.showNextButton = false;
        const pageIndex = parseInt(state.BookPage) - 1;
        const answerArray = [...state.BookData.pages[pageIndex].pageParts[0].lineParts];
        if (state.textSeriesRevealed >= answerArray.length) {
          state.bookStyle.showNotepadClickButton = false;
          state.bookStyle.showNextButton = true;
        }
      }
      else if (type == 'readFull') {
        state.bookStyle.showNotepadClickButton = false;
        state.bookStyle.showNextButton = true;
      }
      else if (type == 'end') {
        state.bookStyle.showNextButton = false;
        state.bookStyle.showPrevButton = false;
        state.bookStyle.showScorePill = false;
        state.bookStyle.showPagePill = false;
        state.bookStyle.showCover = true;
      }
      else if (type == 'cover') {
        state.bookStyle.showPrevButton = false;
        state.bookStyle.showCover = true;
      }
      else if (type == 'join') {
        state.bookStyle.showPrevButton = false;
        state.bookStyle.showNextButton = false;
        state.bookStyle.showScorePill = false;
        state.bookStyle.showPagePill = false;
      }
    },
    SET_NEXT_BOOK(state, bookId) {
      const nextBook = state.BookArray.filter(book => book.bookId == "" + bookId)[0];
      state.nextCoverImageUrl = nextBook.bookCoverImageUrl;
      state.nextCoverLink = nextBook.bookCoverImageUrl;
    }
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
    async fetchBookData({ commit, state }, bookId) {
      const existingData = localStorage.getItem('BookData');
      if (existingData && state.BookId != bookId || existingData == null) {
        const response = await axios.get(resource_uri + `/${bookId}`);
        commit('SET_BOOK_DATA', response.data);
      }
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
    setBookId({ commit }, newId) {
      commit('SET_BOOK_ID', newId);
    },
    setBookPage({ commit, dispatch }, newPage) {
      commit('SET_BOOK_PAGE', parseInt(newPage));
      //This probably needs to go somewhere else Aaron, but i need page updated every time a page is loaded
      dispatch("setPageType");

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
    setAnswerClicked({ commit, dispatch, state }, index) {
      commit('SET_ANSWER_CLICKED', index);
      const pageIndex = parseInt(state.BookPage) - 1;
      const answerArray = [...state.BookData.pages[pageIndex].pageParts[0].lineParts].splice(1);
      if (answerArray[index].isCorrectAnswer == false) {
        dispatch('setPageType', 'failAnimation')
      }
      else {
        dispatch('setPageType', 'passAnimation')
      }
    },
    dinoAnimationDone({ commit, dispatch, state }) {
      if (state.pageMicroType == "failAnimation") {
        dispatch('setPageType', 'questionLoaded')
      }
      else {
        dispatch('gotoNext');
      }
    },
    setChoiceClicked({ commit, dispatch, state }, skipVal) {
      commit('SET_CHOICE_CLICKED', skipVal);
    },
    setPageStyle({ commit }) {
      commit('SET_PAGE_STYLE')
    },

    incrementTextRevealed({ commit, dispatch, state }) {

      commit('INCREMENT_TEXT_REVEALED');
      dispatch('setPageType')

    },
    savePlayerName({ commit, dispatch, state }, sPlayerName) {
      commit('SET_PLAYER_NAME', sPlayerName);
      dispatch('setPageType');
    },
    gotoNext({ commit, state, dispatch, getters }) {
      let tempPage = getters.nextPage;
      console.log(tempPage)
      if (tempPage > getters.HighestPage) {
        dispatch("setHighestPage", tempPage);
      }

      dispatch("setBookPage", tempPage);
      router.push(`/book/${state.BookId}/${tempPage}`);

    },
    questionLoadDone({ commit, dispatch }) {
      let a = 'questionLoaded';
      dispatch('setPageType', a);
    },


    setPageType({ commit, dispatch, state }, microType) {
      const pageIndex = parseInt(state.BookPage) - 1;
      if (microType === undefined)
        microType = state.BookData.pages[pageIndex].type;
      var answerArray = [];
      var textArray = [];
      if (state.BookData.pages[pageIndex].pageParts.length > 0) {
        answerArray = answerArray.concat([...state.BookData.pages[pageIndex].pageParts[0].lineParts].splice(1));
        textArray = textArray.concat([...state.BookData.pages[pageIndex].pageParts[0].lineParts]);
      }
      if (microType == 'question' && answerArray.some(e => e.clickedOn && e.isCorrectAnswer)) {
        //need to fix 0 up there
        commit('SET_PAGE_TYPE', "questionAnsweredCorrect")
      }
      else if (microType == 'read' && state.textSeriesRevealed >= textArray.length) {
        commit('SET_PAGE_TYPE', 'readFull')
      }
      else if (microType == 'cover' && state.playerName == "") {
        commit('SET_PAGE_TYPE', 'join')
      }
      else {
        commit('SET_PAGE_TYPE', microType)
      }
      dispatch('setPageStyle')
    },

    setNextBookItem({ commit }, bookId) {
      commit('SET_NEXT_BOOK', bookId);
    }
  },
  modules: {
  },
});
