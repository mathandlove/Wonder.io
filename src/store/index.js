import { createStore } from 'vuex';
import axios from 'axios';
import Book10 from '../assets/Books/book10/book.json';
import Book10Item from '../assets/Books/book10/book10item.json';
import router from '../router/index.js'
import VueResource from 'vue-resource';


const resource_uri = 'https://localhost:5001/book';
// const resource_uri = 'https://wonderstories-api-dev-as.azurewebsites.net/book';
//Helper Functions

const randomNum = (a, b) => {
  const minNum = Math.ceil(a);
  const maxNum = Math.floor(b);
  return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum);
}

const boundScore = (newScore, oldScore, pointsDoubled) => {

  if (newScore - oldScore < 200 * (pointsDoubled ? 2 : 1)) {
    return oldScore + 200 * (pointsDoubled ? 2 : 1);
  }
  else if (pointsDoubled && newScore - oldScore > 2000) {
    return oldScore + 2000;
  }
  else if (!pointsDoubled && newScore - oldScore > 1000) {
    return oldScore + 1000;
  }
  else {
    return newScore;
  }
}


export default createStore({


  state: {
    GradeFilter: +localStorage.getItem('GradeFilter') || 'grade2',
    GradeBookOrder: JSON.parse(localStorage.getItem('GradeBookOrder')) || {
      gradePreK: [10],
      gradeK: [10],
      grade1: [10],
      grade2: [10],
      grade3: [10],
      grade4: [10],
      grade5: [10],
      grade6: [10],
      preview: [10],
      none: [10],
    },
    WordFilteredBooks: [Book10Item],
    GradeFilteredBookItems: [Book10Item],
    filteredBooks: [],
    booksToDisplay: [],
    SelectedBookItem: JSON.parse(localStorage.getItem('SelectedBook')) || Book10Item,
    BookData: JSON.parse(localStorage.getItem('BookData')) || Book10,
    BookArray: JSON.parse(localStorage.getItem('BookArray')) || [Book10Item],
    HighestPage: +localStorage.getItem('HighestPage') || 1,
    BookId: +localStorage.getItem('BookId') || 10,
    BookPage: +parseInt(localStorage.getItem('BookPage')) || 1,
    AspectRatio: +localStorage.getItem('AspectRatio') || 1,
    Scores: [
      {
        id: 0, name: 'Player1', OldScore: 0, NewScore: 0, upRank: false
      },
      {
        id: 1, name: 'Crafter234', OldScore: 0, NewScore: 0, upRank: false
      },
      {
        id: 2, name: 'MadderMax', OldScore: 0, NewScore: 0, upRank: false
      },
      {
        id: 3, name: 'GoofyCat6', OldScore: 0, NewScore: 0, upRank: false
      },
    ],
    bookScoresDict: {
      "1": []
    },
    bookMarkDict: {
    },

    // JSON.parse(localStorage.getItem('Scores')) || 
    //Aaron here a variety of things I need for each page.
    //Also note that some of my Getters actually found somethings in your BookData in case you chage that.

    mainQCText: "The Case of the Bedroom Egg", //Title or Question
    skipNextAmount: 1, //Each page shows next page increase
    totalNumberOfPages: 1,
    author: "",

    nextBook: {},

    //Everything below are the UX variables you do not need to change.
    bookStyle: {
      showPagePill: true,
      showScorePill: false,
      showPrevButton: true,
      showNextButton: true,
      showNotepadClickButton: false,
      sheetHasLines: false,
      showCover: false,
      showModal: false
    },

    textSeriesRevealed: 1,
    pageMicroType: "read",
    playerName: '',
    turnOffAnimations: false,
    timerStart: 0,
    lineHeightPixels: 1,
    bookDataLoaded: false,
    animatepencil: true,
    pageHistory: [1]
    //pageMicroType determines that exact state of  the page for example there's a difference between read and read fully

  },
  getters: {
    bookDataLoaded: state => {
      return state.bookDataLoaded;
    },
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
    currentBookParagraph: (state) => (pageNumber) => {
      return state.BookData.pages[+pageNumber - 1];
    },
    questionNumber: (state, getters) => {
      return getters.currentBookParagraph.questionNumber;
    },
    questionNumber: (state, getters) => (pageNumber) => {
      return getters.currentBookParagraph(pageNumber).questionNumber;
    },
    chapterNumber: (state, getters) => {
      return getters.currentBookParagraph.chapterNumber;
    },
    chapterNumber: (state, getters) => (pageNumber) => {
      return getters.currentBookParagraph(pageNumber).chapterNumber;
    },
    mainText: (state, getters) => {
      return getters.currentBookParagraph.pageTitleText;
    },
    mainText: (state, getters) => pageNumber => {
      return getters.currentBookParagraph(pageNumber).pageTitleText;
    },
    questionImageUrl: (state, getters) => {
      const things = getters.currentBookParagraph.pageParts[0].partImageUrl;
      return things;
    },
    questionImageUrl: (state, getters) => pageNumber => {
      const things = getters.currentBookParagraph(pageNumber).pageParts[0].partImageUrl;
      return things;
    },
    totalLinesOnPage: (state, getters) => {
      return getters.currentBookParagraph.pageParts[0].totalLines;
    },
    totalLinesOnPage: (state, getters) => pageNumber => {
      return getters.currentBookParagraph(pageNumber).pageParts[0].totalLines;
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
      return state.BookData.pages[pageNumber - 1].type.toLowerCase();
    },
    pageType: state => pageNumber => {
      return state.BookData.pages[pageNumber - 1].type.toLowerCase();
    },
    pageMicroType: state => {
      return state.pageMicroType;
    },

    playerScore: state => {
      const index = state.Scores.map(e => e.id).indexOf(0)
      return state.Scores[index].NewScore;
    },
    playerRank: state => {
      const index = state.Scores.map(e => e.id).indexOf(0)
      return 1 + index;
    },
    allScoreCards: state => {
      return state.Scores;
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
      return state.bookStyle.showPrevButton && !state.bookStyle.showModal;
    },
    showNextButton: state => {
      return state.bookStyle.showNextButton && !state.bookStyle.showModal;
    },
    sheetHasLines: state => {
      return state.bookStyle.sheetHasLines;
    },
    coverHREF: state => {
      return state.SelectedBookItem.largeBookCoverImageUrl
    },

    textSeries: (state) => pageNumber => {



      var pageLineParts = [];
      var array = state.BookData.pages[pageNumber - 1].pageParts;

      if (pageNumber != state.BookPage) {
        for (let index = 0; index < array.length; index++) {
          const element = array[index];
          pageLineParts = pageLineParts.concat(element.lineParts);
        }
        return pageLineParts;
      }
      else {
        for (let index = 0; index < state.textSeriesRevealed; index++) {
          const element = array[index];
          pageLineParts = pageLineParts.concat(element.lineParts);
        }
        return pageLineParts;
      }

    },
    seriesAllRead: (state) => {
      return state.BookData.pages[state.BookPage - 1].pageParts.length <= (state.textSeriesRevealed)
    },
    animatePencil: (state) => {
      return state.animatepencil;
    },

    answerArray: (state, getters) => {
      //Answer Array is an array of answers the student can guess. Please randomize answers.
      let pageNumber = parseInt(state.BookPage);
      let answers = [...state.BookData.pages[pageNumber - 1].pageParts[0].lineParts].splice(1);
      return answers;
    },
    answerArray: (state, getters) => pageNumber => {
      //Answer Array is an array of answers the student can guess. Please randomize answers.
      let answers = [...state.BookData.pages[pageNumber - 1].pageParts[0].lineParts].splice(1);
      return answers;
    },
    bookStyle: state => {
      return state.bookStyle;
    },
    bookTitle: state => {
      return state.BookData.title;
    },

    nextPage: (state, getters) => (nextPagePlus) => {

      let pageNumber = state.BookPage;
      if (nextPagePlus === undefined) {
        nextPagePlus = getters.skipNextAmount(pageNumber);
      }
      // This needs to access the NextPage of the page property (default is 1)
      console.log("going to page: " + (pageNumber + "+" + nextPagePlus))
      return pageNumber + nextPagePlus;
    },
    skipNextAmount: state => pageNumber => {
      return state.BookData.pages[pageNumber - 1].nextPage;
    },
    nextBookHREF: state => {
      return state.nextBook.nextCoverImageUrl;
    },
    getNextBook: state => {

      return state.nextBook
    },
    isDoublePoints: (state, getters) => {
      var totalQuestions = state.BookData.pages.filter(page => page.questionNumber > 0).length;
      return getters.questionNumber / totalQuestions > .6

    },
    isDoublePoints: (state, getters) => pageNumber => {
      var totalQuestions = state.BookData.pages.filter(page => page.questionNumber > 0).length;
      return getters.questionNumber(pageNumber) / totalQuestions > .6

    },
    isLastQuestion: (state, getters) => pageNumber => {
      var totalQuestions = state.BookData.pages.filter(page => page.questionNumber > 0).length;
      return getters.questionNumber(pageNumber) == totalQuestions;

    },
    showQuestionImage: (state, getters) => {
      return getters.answerArray[0].lineType == "answerCoords";
    },
    showQuestionImage: (state, getters) => pageNumber => {

      return getters.answerArray(pageNumber)[0].lineType == "answerCoords";
    },
    booksToDisplay: (state) => {
      return state.booksToDisplay;
    },
    turnOffAnimations: (state) => {
      return state.turnOffAnimations;
    },
    firstBookReadEver: (state, getters) => {
      return Object.keys(getters.bookScoresDict).length < 3;
    },
    bookScoresDict: (state) => {

      return state.bookScoresDict;

    },
    getBookItem: (state) => {
      return state.SelectedBookItem
    },
    lastPageVisited: (state) => {
      return state.pageHistory[state.pageHistory.length - 1];
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
      state.bookDataLoaded = true;
      localStorage.setItem('BookData', JSON.stringify(state.BookData));
    },
    SET_HIGHEST_PAGE(state, event) {
      state.HighestPage = event;
      localStorage.setItem('HighestPage', event);
    },
    SET_BOOK_ID(state, event) {
      state.BookId = event;
      state.bookDataLoaded = false;
      localStorage.setItem('BookId', event);
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


    CLEAR_SCORES(state) {
      for (let i = 0; i <= 3; i += 1) {
        state.Scores[i].OldScore = 0;
        state.Scores[i].NewScore = 0;
      }
      localStorage.setItem('Scores', JSON.stringify(state.Scores));
      state.playerName = '';
    },
    SET_ANSWER_CLICKED(state, index) {
      let pageNumber = parseInt(state.BookPage);
      const selectedItem = [...state.BookData.pages[pageNumber - 1].pageParts[0].lineParts].splice(1)[index];
      selectedItem.clickedOn = true;
      selectedItem.disabled = true;
    },
    INCREMENT_TEXT_REVEALED(state) {
      state.textSeriesRevealed++;
    },
    RESET_TEXT_INCREMENT(state) {
      state.textSeriesRevealed = 1;


    },
    FILL_TEXT_INCREMENT(state) {
      state.textSeriesRevealed = state.BookData.pages[state.BookPage - 1].pageParts.length;

    },
    SET_PAGE_TYPE(state, type) {
      const pageIndex = parseInt(state.BookPage) - 1;
      console.log('microState: ' + type, ' pagetype: ' + state.BookData.pages[pageIndex].type.toLowerCase())
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

    },
    INCREASE_BOOKS_TO_DISPLAY(state, increaseNumber) {
      let numberOfBooksLoaded = state.booksToDisplay.length;
      let toAddArray = state.filteredBooks.slice(numberOfBooksLoaded, numberOfBooksLoaded + increaseNumber)
      state.booksToDisplay = state.booksToDisplay.concat(toAddArray);

    },
    RESET_BOOKS_TO_DISPLAY(state) {
      state.booksToDisplay = [];
    },
    FILTER_BOOKS(state) {
      let gbo =
        state.GradeBookOrder[state.GradeFilter];

      gbo = gbo.map(String);
      //This needs to be cut once we get the right gradeBookOrder into the program.
      let f1Books = state.BookArray.filter((book) => {
        return gbo.includes(book.bookId);
      });
      let f2Books = f1Books.sort(function compareFn(a, b) {
        return gbo.indexOf(a.bookId) - gbo.indexOf(b.bookId);
      });
      state.filteredBooks = f2Books;
    },
    TOGGLE_MODAL(state, bModalOn) {
      state.bookStyle.showModal = bModalOn;
    },
    ADD_POINTS(state, points) {
      const index = state.Scores.map(e => e.id).indexOf(0)
      state.Scores[index].NewScore = state.Scores[index].NewScore + Math.round(points);
    },
    SET_BOT_POINTS(state, aPoints) {
      let index = 0
      for (let i = 1; i < 4; i++) {
        index = state.Scores.map(e => e.id).indexOf(i)
        state.Scores[index].NewScore = Math.round(aPoints[i - 1])
      }
    },
    SAVE_FINAL_SCORE(state, [score, rank, bookNumber]) {
      let oldScoreDict = JSON.parse(localStorage.getItem('BookScoresDictionary'));

      if (oldScoreDict == undefined) {
        oldScoreDict = {}
      }
      let newScore = 0;
      let newRank = 4;
      if (bookNumber in oldScoreDict) {
        if (oldScoreDict[bookNumber][0] < score) {
          newScore = score;
        }
        else {
          newScore = oldScoreDict[bookNumber][0];
        }
        if (oldScoreDict[bookNumber][1] > rank) {
          newRank = rank;
        }
        else {
          newRank = oldScoreDict[bookNumber][1];
        }
        oldScoreDict[bookNumber] = [newScore, newRank]
      }
      else {
        oldScoreDict[bookNumber] = [score, rank]
      }


      localStorage.setItem('BookScoresDictionary', JSON.stringify(oldScoreDict));
      console.log('saved bookscoresdict to: ' + oldScoreDict)
      state.bookScoresDict = oldScoreDict;
    },
    START_SCORE_TIMER(state) {
      state.timerStart = new Date().getTime();
    },
    UPDATE_SCORES(state) {
      state.Scores = state.Scores.sort(function compareFn(a, b) {
        return b.NewScore - a.NewScore;
      });
      state.Scores.map(a => a.OldScore = a.NewScore)



    },
    SET_LINE_HEIGHT_PIXELS(state, val) {
      state.lineHeightPixels = val;
    },
    SET_NEXT_BOOK(state, oldBookId) {
      let index = state.filteredBooks.findIndex(book => !(book.bookId in state.bookScoresDict) && book.bookId != oldBookId)
      state.nextBook = state.filteredBooks[index];
      // console.log("set next book to: " + state.nextBook.bookId)


    },

    SAVE_BOOKMARK(state) {

      state.bookMarkDict[state.BookId] = {
        Scores: state.Scores,
        pageHistory: state.pageHistory,

      }

      localStorage.setItem('bookMarkDict', JSON.stringify(state.bookMarkDict));
    },
    LOAD_BOOKMARK(state) {

      state.bookMarkDict = JSON.parse(localStorage.getItem('bookMarkDict'));

      if (state.BookId in state.bookMarkDict) {
        state.Scores = state.bookMarkDict[state.BookId].Scores;

        state.pageHistory = state.bookMarkDict[state.BookId].pageHistory;
      }
      else {
        state.pageHistory = [1];
        console.log('started new web history for ' + state.BookId)
      }
    },
    LOAD_SCORE_DICT(state) {
      let temp = {};
      temp = JSON.parse(localStorage.getItem('BookScoresDictionary'));
      if (temp === null)
        state.bookScoresDict = {};
      else {
        state.bookScoresDict = temp;
      }
    },


    SET_PAGE_STYLE(state) {
      const type = state.pageMicroType;

      state.bookStyle.showScorePill = true;
      state.bookStyle.showPagePill = true;
      state.bookStyle.showPrevButton = true;
      state.bookStyle.showNextButton = true;
      state.bookStyle.showNotepadClickButton = false;
      state.bookStyle.showCover = false;
      state.bookStyle.sheetHasLines = false;
      if (type == "questiontitle") {
        state.bookStyle.sheetHasLines = false;
      }
      else if (type == "question") {
        state.bookStyle.sheetHasLines = false;
        state.bookStyle.showNextButton = false;
      }
      else if (type == "questionloaded") {
        state.bookStyle.sheetHasLines = false;
        state.bookStyle.showNextButton = false;
      }
      else if (type == "failanimation" || type == "passanimation") {
        state.bookStyle.sheetHasLines = false;
        state.bookStyle.showNextButton = false;
        state.bookStyle.showPrevButton = false;
      }
      else if (type == "questionscoreupdated") {
        state.bookStyle.sheetHasLines = false;
        state.bookStyle.showNextButton = true;
        state.bookStyle.showPrevButton = true;

      }

      else if (type == "questionansweredcorrect") {
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
        state.bookStyle.showNextButton = false;

      }
      else if (type == 'readfull') {
        state.bookStyle.showNotepadClickButton = false;
        state.bookStyle.showNextButton = true;
        state.bookStyle.sheetHasLines = true;
      }
      else if (type == 'nextbookpage') {
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

  },
  actions: {
    async fetchGradeFilters({ commit }) {
      let existingFilters = localStorage.getItem('GradeBookOrder');
      // if (existingFilters == null) {
      if (true) {
        const response = await axios.get(resource_uri + '/gradefilters');
        commit('SET_GRADE_BOOK_ORDER', response.data);
      }

      // else {
      //   commit('SET_GRADE_BOOK_ORDER', JSON.parse(existingFilters));
      //   }


    },
    async fetchBookData({ commit, state }, bookId) {
      // const existingData = localStorage.getItem('BookData');
      // if (existingData && state.BookId != bookId || existingData == null) {
      const response = await axios.get(resource_uri + `/${bookId}`);
      commit('SET_BOOK_DATA', response.data);
      // }
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
      console.log('setting book page to: ' + newPage)
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
      if (answerArray[index].isCorrectAnswer == false && !state.turnOffAnimations) {
        dispatch('setPageType', 'failanimation')
      }
      else if (!state.turnOffAnimations) {
        dispatch('setPageType', 'passanimation')
      }
      else if (state.turnOffAnimations && answerArray[index].isCorrectAnswer == true) {
        dispatch('dinoAnimationDone');
      }
    },
    dinoAnimationDone({ commit, dispatch, state }) {
      console.log('dinoAnimationDone')

      if (state.pageMicroType == "failanimation") {
        dispatch('setPageType', 'questionloaded')
      }
      else {
        dispatch('addPoints')
        dispatch('setPageType', 'scorepage')
      }
    },

    setPageStyle({ commit }) {
      commit('SET_PAGE_STYLE')
    },

    incrementTextRevealed({ commit, dispatch, state }) {
      state.animatepencil = false;
      setTimeout(() => { state.animatepencil = true; }, 400);
      commit('INCREMENT_TEXT_REVEALED');
      dispatch('setPageType')

    },
    resetTextIncrement({ commit }) {
      commit('RESET_TEXT_INCREMENT');
    },
    fillTextIncrement({ commit }) {
      commit('FILL_TEXT_INCREMENT');
    },
    savePlayerName({ commit, dispatch, state }, sPlayerName) {
      commit('SET_PLAYER_NAME', sPlayerName);
      dispatch('setPageType');
    },
    gotoNext({ commit, state, dispatch, getters }, skipVal) {
      console.log('sv: ' + skipVal)
      let tempPage = getters.nextPage(skipVal);
      if (tempPage > getters.HighestPage) {

        dispatch("setHighestPage", tempPage);

      }
      dispatch("resetTextIncrement");
      dispatch("setBookPage", tempPage);
      state.pageHistory.push(tempPage);
      dispatch("saveBookmark");

      router.push(`/book/${state.BookId}/${tempPage}`);


    },
    gotoPrev({ commit, state, dispatch, getters }) {
      console.log('prev: ' + state.pageHistory);
      let prevPage = 1;
      if (state.pageHistory.length > 2) {
        state.pageHistory.pop();
        prevPage = state.pageHistory[state.pageHistory.length - 1];
      }
      else {
        console.log('user error: user loaded story in the middle and went back to page: ' + state.pageHistory[0])
        state.pageHistory = [1];
        prevPage = 1;
      }



      dispatch("setBookPage", prevPage);
      dispatch("fillTextIncrement");
      dispatch("saveBookmark");
      router.push(`/book/${state.BookId}/${prevPage}`);



    },
    questionLoadDone({ commit, dispatch }) {
      dispatch('setPageType', 'questionloaded');
      dispatch('startScoreTimer')
    },
    increaseBooksToDisplay({ commit }, increaseNumber) {
      commit('INCREASE_BOOKS_TO_DISPLAY', increaseNumber);
    },
    resetBooksToDisplay({ commit }) {
      commit('RESET_BOOKS_TO_DISPLAY');
    },
    filterBooks({ commit }) {
      commit('FILTER_BOOKS')
    },
    toggleModal({ commit }, bModalOn) {
      commit('TOGGLE_MODAL', bModalOn)
    },
    resetBook({ commit, dispatch, state }) {
      dispatch("setHighestPage", 1);
      dispatch("setBookPage", 1);
      dispatch("ClearScores");
      dispatch("toggleModal", false)
      router.push(`/book/${state.BookId}/1`);
      dispatch("setPageType")
    },
    addPoints({ commit, state, getters }) {
      let timeToAnswer = (new Date().getTime() - state.timerStart) / 1000;
      let points = 0;
      const fullPointTime = .1;
      const smallPointTime = 20;
      if (timeToAnswer < fullPointTime) {
        points = 1000;
      }
      else if (timeToAnswer > smallPointTime) {

        points = 200;
      }
      else {
        points = -800 / (smallPointTime - fullPointTime) * (timeToAnswer - fullPointTime) + 1000
      }



      if (getters.isDoublePoints(state.BookPage)) {
        points = points * 2;
      }
      commit('ADD_POINTS', points);
      this.dispatch('setBotPoints')
    },
    setBotPoints({ commit, state, getters }) {
      let index = 0;
      let idealNewScore = 0;
      const isDouble = getters.isDoublePoints(state.BookPage);
      // Bot 1
      index = state.Scores.map(e => e.id).indexOf(1)
      idealNewScore = getters.playerScore + randomNum(-1500, 1500)
      let bot1Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);

      index = state.Scores.map(e => e.id).indexOf(2)
      idealNewScore = getters.playerScore + randomNum(-500, 500)
      let bot2Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);

      index = state.Scores.map(e => e.id).indexOf(3)
      idealNewScore = getters.playerScore + randomNum(-800, -1)
      let bot3Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);

      if (getters.isLastQuestion(state.BookPage)) {
        let playerWins = true;
        if (Math.random() < .15) {
          playerWins = false;
        }

        if (playerWins || getters.firstBookReadEver) {
          index = state.Scores.map(e => e.id).indexOf(1)
          idealNewScore = getters.playerScore + randomNum(-1500, -1)
          bot1Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);

          index = state.Scores.map(e => e.id).indexOf(2)
          idealNewScore = getters.playerScore + randomNum(-200, -1)
          bot2Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);

          index = state.Scores.map(e => e.id).indexOf(3)
          idealNewScore = getters.playerScore + randomNum(-2000, -1000)
          bot3Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);

        }
        else {

          index = state.Scores.map(e => e.id).indexOf(2)
          idealNewScore = getters.playerScore + randomNum(1, 250)
          bot2Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);
          if (bot2Score < getters.playerScore) {
            index = state.Scores.map(e => e.id).indexOf(1)
            idealNewScore = getters.playerScore + randomNum(1, 250)
            bot1Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);
          }
          else {
            index = state.Scores.map(e => e.id).indexOf(1)
            idealNewScore = getters.playerScore + randomNum(-200, -1)
            bot1Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);
          }


          index = state.Scores.map(e => e.id).indexOf(3)
          idealNewScore = getters.playerScore + randomNum(-800, -1)
          bot3Score = boundScore(idealNewScore, state.Scores[index].OldScore, isDouble);

        }


      }

      commit('SET_BOT_POINTS', [bot1Score, bot2Score, bot3Score])
    },

    startScoreTimer({ commit }) {
      commit('START_SCORE_TIMER');
    },
    updateScores({ commit, dispatch }) {
      commit('UPDATE_SCORES')

    },
    scoreAnimationComplete({ commit, dispatch }) {
      dispatch("setPageType", "questionscoreupdated")
    },
    setLineHeightPixels({ commit }, val) {
      commit('SET_LINE_HEIGHT_PIXELS', val)
    },
    saveFinalScore({ commit, getters, state }) {

      commit('SAVE_FINAL_SCORE', [getters.playerScore, getters.playerRank, state.BookId])
    },
    loadScoreDict({ commit }) {
      commit('LOAD_SCORE_DICT')
    },

    showFinalScoreDone({ commit, dispatch }) {
      dispatch("setPageType", "nextbookpage")
    },



    setPageType({ commit, dispatch, state, getters }, microType = '') {
      const pageIndex = parseInt(state.BookPage) - 1;

      if (microType === '')
        microType = state.BookData.pages[pageIndex].type.toLowerCase();
      else {
        microType = microType.toLowerCase();
      }
      let mainType = state.BookData.pages[pageIndex].type;
      var answerArray = [];
      var textArray = [];
      if (state.BookData.pages[pageIndex].pageParts.length > 0) {
        answerArray = answerArray.concat([...state.BookData.pages[pageIndex].pageParts[0].lineParts].splice(1));
        textArray = textArray.concat([...state.BookData.pages[pageIndex].pageParts[0].lineParts]);
      }


      if (microType == 'question' && answerArray.some(e => e.clickedOn && e.isCorrectAnswer)) {
        //need to fix 0 up there
        commit('SET_PAGE_TYPE', "questionansweredcorrect")
      }
      else if (mainType == 'question' && microType != 'questionloaded' && microType != 'questionscoreupdated' && microType != 'scorepage' && state.turnOffAnimations) {
        dispatch('questionLoadDone')
      }
      else if (microType == 'read' && getters.seriesAllRead) {
        commit('SET_PAGE_TYPE', 'readfull')
      }
      else if (microType == 'cover' && state.playerName == "") {
        commit('SET_PAGE_TYPE', 'join')
      }
      else {
        commit('SET_PAGE_TYPE', microType)
      }

      if (microType == 'end') {
        dispatch('saveFinalScore')
      }

      dispatch('setPageStyle')
    },

    setNextBookItem({ commit }, bookId) {
      commit('SET_NEXT_BOOK', bookId);
    },
    saveBookmark({ commit }) {
      commit('SAVE_BOOKMARK');
    },
    loadBookmark({ commit, dispatch, state }) {
      state.bookMarkDict = localStorage.getItem('bookMarkDict');
      if (state.bookMarkDict == undefined) {
        console.log('No Bookmark Dictionary found. Creating a new one.')
        state.bookMarkDict = {};

        dispatch('saveBookmark');
      }

      commit('LOAD_BOOKMARK');
      if (state.pageHistory[state.pageHistory.length - 1] != state.BookPage) {
        console.log("User Error. User jumped from page " + state.pageHistory[state.pageHistory.length - 1] + " " + state.BookPage)
        //I should likely just send them to page 1 at some point here, but annoying for debugging.
      }
    },
  },
  modules: {
  },
}
);
