<template>
  <the-background>
    <MainNavBar @show-modal="this.ViewRestartModal = true" />
    <RestartModal
      v-if="this.ViewRestartModal"
      @close-modal="this.ViewRestartModal = false"
    />
    <notebook-page>
      <question-title-elements v-if="pageType === 'questiontitle'" />
      <read-elements v-else-if="pageType === 'read'" />
      <join-elements v-else-if="pageMicroType === 'join'" />
      <fail-animation
        v-else-if="
          pageMicroType === 'failAnimation' || pageMicroType === 'passAnimation'
        "
      />
      <question-elements
        v-else-if="
          pageMicroType === 'questionLoaded' ||
          pageMicroType === 'questionAnsweredCorrect'
        "
      />
      <question-load-elements v-else-if="pageType === 'question'" />
      <choice-elements v-else-if="pageType === 'choice'" />
      <chapter-title-elements v-else-if="pageType === 'chapterTitle'" />
      <end-elements v-else-if="pageType === 'end'" />
      
    </notebook-page>

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
import EndElements from "@/components/booklayout/EndElements.vue";
import FailAnimation from "@/components/booklayout/FailAnimation.vue";
import QuestionLoadElements from "@/components/booklayout/QuestionLoadElements.vue";

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
    EndElements,
    FailAnimation,
    QuestionLoadElements,
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
    ...mapGetters(["pageType", "seriesAllRead", "nextPage", "pageMicroType"]),
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
      this.$router.push(`/book/${this.$store.state.BookID}/${tempPage}`);
      event.stopPropagation();
    },
    ToggleHand(newValue) {
      this.ShowHand = newValue;
    },
    //Elliott Added Methods
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
