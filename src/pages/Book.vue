<template>
  <the-background>
    <MainNavBar @show-modal="this.ViewRestartModal = true" />
    <RestartModal
      v-if="this.ViewRestartModal"
      @close-modal="this.ViewRestartModal = false"
    />
    <notebook-page>
      <question-title-elements />
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
import MainFooter from "@/molecules/MainFooter.vue";

import MainNavBar from "@/molecules/MainNavBar.vue";
import BookFooter from "@/components/booklayout/BookFooter.vue";
import TheBackground from "@/components/ux/TheBackground.vue";
import NotebookPage from "@/components/booklayout/NotebookPage.vue";
import JoinElements from "@/components/booklayout/JoinElements.vue";
import ReadElements from "@/components/booklayout/ReadElements.vue";
import QuestionTitleElements from "@/components/booklayout/QuestionTitleElements.vue";

import { mapState } from "vuex";
export default {
  components: {
    MainFooter,
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
    ReadElements,
    QuestionTitleElements,
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
        hasLines: false,
        showScore: false,
        showPage: false,
        pageNumber: 2,
        showNext: false,
        gotoNext: this.RouteNextPage,

        showPrevious: false,
        gotoPrev: this.RoutePrevPage,
        bookTitle: "The Case of the Mystery Egg",
        questionNumber: 2,
        mainText: "No cheating",
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
    ...mapState(["BookData"]),
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
    RouteNextPage() {
      let tempPage = +this.page + 1;
      if (tempPage > this.TotalPages) {
        this.$router.push("/like");
      } else {
        this.PageSkipArray.forEach((choice) => {
          if (tempPage > choice.StartPage && tempPage < choice.EndPage) {
            if (choice.SelectedPage && tempPage <= choice.SelectedPage) {
              tempPage = choice.SelectedPage;
            } else {
              tempPage = choice.EndPage;
            }
          }
        });
        if (tempPage > this.$store.state.HighestPage) {
          this.$store.dispatch("setHighestPage", tempPage);
        }
<<<<<<< HEAD
        console.log("temp?", JSON.stringify(tempPage));
        this.$store.dispatch("setBookPage", tempPage);
        this.$router.push(`/book/${this.$store.state.BookID}/${tempPage}`);
=======
        console.log('temp?', JSON.stringify(tempPage));
        this.$store.dispatch("setBookPage", tempPage).then(this.$router.push(`/book/${this.$store.state.BookID}/${tempPage}`));
>>>>>>> parent of 1a9cdd1 (ui workflow update)
      }
    },
    RoutePrevPage() {
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
    },
    ToggleHand(newValue) {
      this.ShowHand = newValue;
    },
    //Elliott Added Methods
    formatQuestion() {
      this.formatNormalRead();
      this.NIV.hasLines = false;
      this.NIV.mainText =
        this.GetPageData.pageParts[0].lineParts[0].words.join(" ");
      if (this.GetPageData.pageParts[0].hasOwnProperty("questionNumber")) {
        this.NIV.questionNumber = this.GetPageData.pageParts[0].questionNumber;
      } else {
        this.NIV.questionNumber = 0;
      }
    },
    formatNormalRead() {
      this.NIV.showScore = true;
      this.NIV.showPage = true;
      this.NIV.showNext = true;
      this.NIV.showPrevious = true;
    },
  },
  created() {
    this.id = this.$route.params.id;
    this.$store.dispatch("setBookID", this.id);
    this.page = this.$route.params.page;
    this.$store.dispatch("setBookPage", this.page);
    this.formatQuestion();
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
