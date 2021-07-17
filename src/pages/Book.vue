<template>
  <FinalScoreAnimation v-if="pageMicroType == 'end'" />
  <audio
    preload="auto"
    autoplay
    v-if="
      pageMicroType == 'end' ||
      pageMicroType == 'nextbookpage' ||
      pageMicroType == 'join'
    "
  >
    <source src="@/assets/sounds/rockTheme.mp3" type="audio/mpeg" />
  </audio>
  <the-background v-if="pageMicroType != 'end'">
    <MainNavBar @show-modal="this.ViewRestartModal = true" />
    <end-elements v-if="pageMicroType === 'nextbookpage'" />
    <div class="notepadsContainer" v-if="pageMicroType != 'nextbookpage'">
      <filled-page-element v-for="pQ in pageQueue" :key="pQ" :pageNum="pQ">
      </filled-page-element>
    </div>
    <book-footer v-if="pageMicroType != 'nextbookpage'" />
  </the-background>
</template>

<script>
import PageNoExist from "@/organisms/PageNoExist.vue";

import MainNavBar from "@/molecules/MainNavBar.vue";
import BookFooter from "@/components/booklayout/BookFooter.vue";
import TheBackground from "@/components/ux/TheBackground.vue";
import FilledPageElement from "@/components/booklayout/FilledPageElement.vue";
import FinalScoreAnimation from "@/components/booklayout/FinalScoreAnimation.vue";
import EndElements from "@/components/booklayout/EndElements.vue";
import Store from "../store/index.js";
import { mapState } from "vuex";
import { mapGetters } from "vuex";

export default {
  components: {
    PageNoExist,
    Store,
    MainNavBar,
    BookFooter,
    TheBackground,
    FilledPageElement,
    FinalScoreAnimation,
    EndElements,
  },
  data() {
    const ViewRestartModal = false;
    const ShowHand = false;
    const HighestPage = 1;
    const PageSkipArray = [];
    const QuestionCounter = 1;

    return {
      BookObject: this.$store.state.BookData,
      TotalPages: this.$store.state.BookData.pages.length,
      ViewRestartModal,
      PageSkipArray,
      ShowHand,

      HighestPage,
      QuestionCounter,

      NIV: {
        gotoNext: this.RouteNextPage,
        gotoPrev: this.RoutePrevPage,
        onNotepadClick: this.incrementTextRevealed,
      },
    };
  },
  props: ["id", "page"],
  provide() {
    return {
      NIV: this.NIV,
    };
  },
  computed: {
    setPageNumber() {
      this.page = parseInt(this.$store.state.BookPage);
    },
    ...mapState(["BookData", "bookStyle", "textSeriesRevealed"]),
    ...mapGetters([
      "seriesAllRead",
      "nextPage",
      "pageMicroType",
      "pageNumber",
      "totalNumberOfPages",
      "getBookItem",
      "totalBooks",
      "gradeFilter",
    ]),
    pageQueue() {
      let prevPage = -1; //this.pageNumber
      let currentPage = this.pageNumber;
      let futurePages = 6;
      let returnArray = [];
      if (prevPage >= 1) {
        returnArray.push(prevPage);
      }
      for (let i = 1; i <= futurePages; i++) {
        if (currentPage + i <= this.totalNumberOfPages) {
          returnArray.push(currentPage + i);
        }
      }
      returnArray.push(currentPage);
      return returnArray;
    },
  },
  beforeRouteUpdate(to, from, next) {
    Store.dispatch("setBookId", to.params.id);
    Store.dispatch("setBookPage", to.params.page);

    next();
  },
  beforeRouteEnter(to, from, next) {
    Store.dispatch("setBookId", to.params.id);
    Store.dispatch("setBookPage", to.params.page);

    //If people are using links to go to books. We should start them at page 1. Keeping for debugging purposes for now.
    next();
  },
  methods: {
    AddChoice(pageChosen) {
      this.PageSkipArray.forEach((choice, index) => {
        if (pageChosen > choice.StartPage && pageChosen < choice.EndPage) {
          this.PageSkipArray[index].SelectedPage = pageChosen;
        }
      });
    },
    RouteNextPage(event) {
      this.$store.dispatch("gotoNext");
      event.stopPropagation();
    },
    RoutePrevPage(event) {
      this.$store.dispatch("gotoPrev");
      event.stopPropagation();
    },
    //Elliott Added Methods
  },

  async mounted() {
    if (this.totalBooks <= 1) {
      await this.$store.dispatch("setBookList");
    }
    if (this.gradeFilter.length < 1) {
      await this.$store.dispatch("fetchGradeFilters");
    }
    let selectedItem = this.$store.state.BookArray.filter(
      (book) => book.bookId == this.id
    )[0];
    if (selectedItem) {
      await this.$store.dispatch("setBookItem", selectedItem);
    }
    await this.$store.dispatch("fetchBookData", this.id);

    this.$store.dispatch("setGradeFilter");
    this.$store.dispatch("filterBooks");
    this.$store.dispatch("loadScoreDict");
    this.$store.dispatch("setNextBookItem");
    this.$store.dispatch("setBookPage", this.page);
    this.$store.dispatch("loadBookmark");
    this.$store.dispatch("saveQuestionsToBookmark");
    this.$store.dispatch("setPageType");
  },
};
</script>

<style>
img {
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
}

.pageContainer {
  position: relative;
  text-align: center;
  padding-top: 1vh;
  padding-bottom: 1vh;
  z-index: 0;
}
.notepadsContainer {
  height: 100%;
  width: 100%;
  position: relative;
}
</style>
