<template>
  <the-background>
    <MainNavBar @show-modal="this.ViewRestartModal = true" />

    <div class="notepadsContainer">
      <filled-page-element v-for="pQ in pageQueue" :key="pQ" :pageNum="pQ">
        "Why wont you work?"
      </filled-page-element>
    </div>
    <book-footer />
  </the-background>
</template>

<script>
import PageRead from "@/organisms/PageRead.vue";
import PageChapter from "@/organisms/PageChapter.vue";
import PageCover from "@/organisms/PageCover.vue";
import PageEnd from "@/organisms/PageEnd.vue";
import PageChoice from "@/organisms/PageChoice.vue";
import PageQuestionTitle from "@/organisms/PageQuestionTitle.vue";
import PageQuestion from "@/organisms/PageQuestion.vue";

import PageNoExist from "@/organisms/PageNoExist.vue";

import MainNavBar from "@/molecules/MainNavBar.vue";
import BookFooter from "@/components/booklayout/BookFooter.vue";
import TheBackground from "@/components/ux/TheBackground.vue";
import FilledPageElement from "@/components/booklayout/FilledPageElement.vue";

import { mapState } from "vuex";
import { mapGetters } from "vuex";

export default {
  components: {
    PageQuestionTitle,
    PageChapter,
    PageRead,
    PageCover,
    PageEnd,
    PageChoice,
    PageQuestion,

    PageNoExist,

    MainNavBar,
    BookFooter,
    TheBackground,
    FilledPageElement,
  },
  data() {
    const ViewRestartModal = false;
    const ShowHand = false;
    const HighestPage = 1;
    const PageSkipArray = [];
    const QuestionCounter = 1;
    let page;
    let id;
    return {
      BookObject: this.$store.state.BookData,
      TotalPages: this.$store.state.BookData.pages.length,
      ViewRestartModal,
      PageSkipArray,
      ShowHand,
      page,
      id,
      HighestPage,
      QuestionCounter,

      NIV: {
        gotoNext: this.RouteNextPage,
        gotoPrev: this.RoutePrevPage,
        onNotepadClick: this.incrementTextRevealed,
      },
    };
  },
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
    ]),
    pageQueue() {
      let prevPage = this.pageNumber - 1;
      let currentPage = this.pageNumber;
      let futurePages = 5;
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
      let tempPage = this.page - 1;
      this.PageSkipArray.forEach((choice) => {
        if (tempPage > choice.StartPage && tempPage < choice.EndPage) {
          if (choice.SelectedPage && tempPage >= choice.SelectedPage) {
            tempPage = choice.SelectedPage;
          } else {
            tempPage = choice.StartPage;
          }
        }
      });
      this.$store.dispatch("setBookPage", tempPage);
      this.$router.push(`/book/${this.$store.state.BookId}/${tempPage}`);
      event.stopPropagation();
    },
    ToggleHand(newValue) {
      this.ShowHand = newValue;
    },
    //Elliott Added Methods
  },
  created() {
    this.id = this.$route.params.id;
    this.$store.dispatch("setBookId", this.id);
    this.page = this.$route.params.page;
    this.$store.dispatch("setBookPage", this.page);
  },
  async mounted() {
    await this.$store.dispatch("setBookList").then(async () => {
      let selectedItem = this.$store.state.BookArray.filter(
        (book) => book.bookId == this.id
      )[0];
      if (selectedItem) {
        await this.$store.dispatch("setBookItem", selectedItem);
        this.$store.dispatch("setBookPage", this.page);
      }
    });
    await this.$store.dispatch("fetchBookData", this.id);
    this.$store.dispatch("filterBooks");
    this.$store.dispatch("setNextBookItem", this.id);
    console.log("created");
  },
  beforeUpdate() {
    this.page = this.$store.state.BookPage;
    this.HighestPage = this.$store.state.HighestPage;
  },
};
</script>

<style scoped>
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
