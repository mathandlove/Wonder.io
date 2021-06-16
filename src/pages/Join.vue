<template>
  <the-background>
    <MainNavBar @show-modal="this.ViewRestartModal = true" />
    <notebook-page>
      <question-elements></question-elements>
    </notebook-page>
    <book-footer />
  </the-background>
</template>

<script>
import MainNavBar from "@/molecules/MainNavBar.vue";
import BookFooter from "@/components/booklayout/BookFooter.vue";
import TheBackground from "@/components/ux/TheBackground.vue";
import NotebookPage from "@/components/booklayout/NotebookPage.vue";
import JoinElements from "@/components/booklayout/JoinElements.vue";
import ReadElements from "@/components/booklayout/ReadElements.vue";
import QuestionElements from "@/components/booklayout/QuestionElements.vue";

export default {
  components: {
    JoinElements,
    MainNavBar,
    BookFooter,
    TheBackground,
    NotebookPage,
    ReadElements,
    QuestionElements,
  },
  data() {
    let userName;

    return {
      userName: "'",
      NIV: {
        hasLines: false,
        showScore: false,
        showPage: false,
        showNext: false,
        showPrevious: false,
        bookTitle: "The Case of the Mystery Egg",
        questionNumber: 2,
        mainText: "What strange thing is going on?",
      },
    };
  },
  provide() {
    return {
      NIV: this.NIV,
    };
  },
  methods: {
    formatQuestion() {
      this.formatNormalRead();
      this.NIV.hasLines = false;
    },
    formatNormalRead() {
      this.NIV.showScore = true;
      this.NIV.showPage = true;
    },
  },
  mounted() {
    this.formatQuestion();
  },
};
</script>
