<template>
  <the-background>
    <MainNavBar @show-modal="this.ViewRestartModal = true" />
    <RestartModal
      v-if="this.ViewRestartModal"
      @close-modal="this.ViewRestartModal = false"
    />
    <notebook-page>
      <!-- <question-title-elements v-if="pageType === 'questiontitle'" /> -->
      <question-title-elements v-if="pageType === 'questiontitle'" />
      <read-elements v-else-if="pageType === 'read'" />
      <question-elements v-else-if="pageType === 'question'" />
      <choice-elements v-else-if="pageType === 'choice'" />
      <chapter-title-elements v-else-if="pageType === 'chapter'" />
      <!-- <read-elements /> -->
      <!-- <PageCover
        v-if="this.bookPageData.type === 'cover'"
        @show-hand="ToggleHand"
      />
      <PageChapter
        v-else-if="this.GetPageData.type === 'chapterTitle'"
        @show-hand="ToggleHand"
        :number="this.GetPageData.chapterNumber"
        :page-text="this.GetPageData.text"
      />
      <PageRead
        v-else-if="this.GetPageData.type === 'read'"
        @show-hand="ToggleHand"
        :data="this.GetPageData.pageParts"
      />
      <PageQuestionTitle
        v-else-if="this.GetPageData.type === 'questiontitle'"
        :data="this.GetPageData.pageParts"
        @show-hand="ToggleHand"
        :counter="this.QuestionCounter"
      />
      <PageQuestion
        v-else-if="this.GetPageData.type === 'question'"
        @show-hand="ToggleHand"
        :data="this.GetPageData.pageParts"
        :counter="this.QuestionCounter"
      />
      <PageChoice
        v-else-if="this.GetPageData.type === 'choice'"
        :data="this.GetPageData.pageParts"
        @chosen-page="AddChoice"
        @show-hand="ToggleHand"
      />
      <PageEnd
        v-else-if="this.GetPageData.type === 'end'"
        @show-hand="ToggleHand"
      />
      <PageNoExist v-else @show-hand="ToggleHand" /> -->
    </notebook-page>
    <!-- <MainFooter :total-pages="this.TotalPages" />
    <NavPrevArrow @prev-page="RoutePrevPage" />
    <NavNextArrow
      @next-page="this.RouteNextPage(true)"
      v-if="this.ShowHand || this.HighestPage > this.page"
    /> -->
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
import RestartModal from "@/molecules/RestartModal.vue";
import PageNoExist from "@/organisms/PageNoExist.vue";

import MainNavBar from "@/molecules/MainNavBar.vue";
import BookFooter from "@/components/booklayout/BookFooter.vue";
import TheBackground from "@/components/ux/TheBackground.vue";
import NotebookPage from "@/components/booklayout/NotebookPage.vue";
import JoinElements from "@/components/booklayout/JoinElements.vue";
import QuestionTitleElements from "@/components/booklayout/QuestionTitleElements.vue";
import ReadElements from "@/components/booklayout/ReadElements.vue";
import QuestionElements from "@/components/booklayout/QuestionElements.vue";
import ChoiceElements from "@/components/booklayout/ChoiceElements.vue";
import ChapterTitleElements from "@/components/booklayout/ChapterTitleElements.vue";

import { mapState } from "vuex";
import { mapGetters } from "vuex";
import { mapActions } from "vuex";
export default {
  components: {
    PageQuestionTitle,
    PageChapter,
    PageRead,
    PageCover,
    PageEnd,
    PageChoice,
    PageQuestion,
    RestartModal,
    PageNoExist,

    JoinElements,
    MainNavBar,
    BookFooter,
    TheBackground,
    NotebookPage,
    QuestionTitleElements,
    ReadElements,
    QuestionElements,
    ChoiceElements,
    ChapterTitleElements,
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
    GetPageData() {
      var tempData;
      if (this.BookObject.pages) {
        this.TotalPages = this.BookObject.pages.length;
        tempData = this.BookObject.pages[+this.page - 1];
        this.AdjustQuestionCounter(
          this.BookObject.pages.slice(0, +this.page - 1)
        );
        if (tempData) {
          return tempData;
        }
      }
      return [{ type: null }];
    },
    bookPageData() {
      this.TotalPages = this.BookData.pages.length;
      this.AdjustQuestionCounter(this.BookData.pages.slice(0, +this.page - 1));
      this.BookData.pages.forEach((page) => {
        if (page.type === "choice") {
          const firstPage = page.pageNumber + 1;
          const totalOptions = page.pageParts[0].lineParts.length;
          const lastPage = firstPage + totalOptions;
          this.PageSkipArray.push({
            StartPage: firstPage,
            SelectedPage: null,
            EndPage: lastPage,
          });
        }
      });
      return this.BookData.pages[+this.page - 1];
    },
    questionCounter() {},
    setPageNumber() {
      this.page = parseInt(this.$store.state.BookPage);
    },
    ...mapState(["BookData", "bookStyle", "textSeriesRevealed"]),
    ...mapGetters(["pageType", "seriesAllRead", "nextPage"]),
  },
  methods: {
    AdjustQuestionCounter(data) {
      let tempCounter = 1;
      data.forEach((item) => {
        if (item.type === "question") {
          tempCounter += 1;
        }
      });
      this.QuestionCounter = tempCounter;
    },
    AddChoice(pageChosen) {
      this.PageSkipArray.forEach((choice, index) => {
        if (pageChosen > choice.StartPage && pageChosen < choice.EndPage) {
          this.PageSkipArray[index].SelectedPage = pageChosen;
        }
      });
    },
    RouteNextPage(event) {
      let tempPage = this.nextPage;
      if (tempPage > this.TotalPages) {
        this.$router.push("/like");
      }

      if (tempPage > this.$store.state.HighestPage) {
        this.$store.dispatch("setHighestPage", tempPage);
      }

      this.$store.dispatch("setBookPage", tempPage);
      this.$router.push(`/book/${this.$store.state.BookID}/${tempPage}`);
      event.stopPropagation();

      // else {
      //   this.PageSkipArray.forEach((choice) => {
      //     if (tempPage > choice.StartPage && tempPage < choice.EndPage) {
      //       if (choice.SelectedPage && tempPage <= choice.SelectedPage) {
      //         tempPage = choice.SelectedPage;
      //       } else {
      //         tempPage = choice.EndPage;
      //       }
      //     }
      //   });
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
      this.$router.push(`/book/${this.$store.state.BookID}/${tempPage}`);
      event.stopPropagation();
    },
    ToggleHand(newValue) {
      this.ShowHand = newValue;
    },
    //Elliott Added Methods
    formatPage() {
      this.resetPage();
      this.formatNormalRead();
      if (this.pageType == "questiontitle") {
        this.formatQuestion();
      } else if (this.pageType == "cover") {
        this.formatCover();
      } else if (this.pageType == "read") {
        this.formatRead();
      }
    },
    resetPage() {
      this.$store.state.textSeriesRevealed = 1;
    },
    formatQuestion() {
      this.bookStyle.sheetHasLines = false;
    },
    formatCover() {
      this.bookStyle.showPrevButton = false;
    },
    formatRead() {
      this.bookStyle.sheetHasLines = true;
      if (!this.seriesAllRead) {
        this.NIV.onNotepadClick = this.incrementTextRevealed;
        this.bookStyle.showNextButton = false;
      }
    },
    incrementTextRevealed() {
      this.$store.state.textSeriesRevealed++;

      if (this.seriesAllRead) {
        this.NIV.onNotepadClick = function () {};
        this.bookStyle.showNextButton = true;
      }
    },
    formatNormalRead() {
      this.bookStyle.showScorePill = true;
      this.bookStyle.showPagePill = true;
      this.bookStyle.showNextButton = true;
      this.bookStyle.showPrevButton = true;
    },
  },
  created() {
    this.id = this.$route.params.id;
    this.$store.dispatch("setBookID", this.id);
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
</style>
