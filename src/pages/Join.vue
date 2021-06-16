<template>
  <the-background>
    <MainNavBar @show-modal="this.ViewRestartModal = true" />
    <notebook-page>
      <read-elements />
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

export default {
  components: {
    JoinElements,
    MainNavBar,
    BookFooter,
    TheBackground,
    NotebookPage,
    ReadElements,
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
      },
    };
  },
  provide() {
    return {
      NIV: this.NIV,
    };
  },
};
</script>
