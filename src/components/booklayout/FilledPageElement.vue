<template>
  <notebook-page>
    {{ pageTypeArray(pageNumber) }}

    <question-title-elements
      v-if="pageTypeArray(pageNumber) === 'questiontitle'"
      :pageNumber="pageNumber"
    />
    <read-elements v-else-if="pageTypeArray(pageNumber) === 'read'" />
    <question-elements v-else-if="pageTypeArray(pageNumber) === 'question'" />
    <choice-elements v-else-if="pageTypeArray(pageNumber) === 'choice'" />
    <chapter-title-elements
      v-else-if="pageTypeArray(pageNumber) === 'chapterTitle'"
    />
    <end-elements v-else-if="pageTypeArray(pageNumber) === 'end'" />
    <join-elements v-else-if="pageMicroType === 'join'" />
  </notebook-page>
</template>

<script>
import JoinElements from "@/components/booklayout/JoinElements.vue";
import QuestionTitleElements from "@/components/booklayout/QuestionTitleElements.vue";
import ReadElements from "@/components/booklayout/ReadElements.vue";
import QuestionElements from "@/components/booklayout/QuestionElements.vue";
import ChoiceElements from "@/components/booklayout/ChoiceElements.vue";
import ChapterTitleElements from "@/components/booklayout/ChapterTitleElements.vue";
import EndElements from "@/components/booklayout/EndElements.vue";
import NotebookPage from "@/components/booklayout/NotebookPage.vue";

import { mapGetters } from "vuex";

export default {
  data() {
    return {
      pageNumber: 2,
    };
  },
  components: {
    JoinElements,
    QuestionTitleElements,
    ReadElements,
    QuestionElements,
    ChoiceElements,
    ChapterTitleElements,
    EndElements,
    NotebookPage,
  },
  computed: {
    setPageNumber() {
      this.page = parseInt(this.$store.state.BookPage);
    },
    ...mapGetters(["pageType", "pageMicroType", "pageTypeArray"]),
  },
};
</script>