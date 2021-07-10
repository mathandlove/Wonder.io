<template>
  <notebook-page :allInvisible="pageNum !== pageNumber">
    <question-title-elements
      v-if="pageType(pageNum) === 'questiontitle'"
      :pageNum="pageNum"
    />

    <read-elements
      v-else-if="pageType(pageNum) === 'read'"
      :pageNum="pageNum"
    />
    <question-elements
      v-else-if="pageType(pageNum) === 'question'"
      :pageNum="pageNum"
    />
    <choice-elements
      v-else-if="pageType(pageNum) === 'choice'"
      :pageNum="pageNum"
    />
    <chapter-title-elements
      v-else-if="pageType(pageNum) === 'chaptertitle'"
      :pageNum="pageNum"
    />

    <join-elements
      v-else-if="pageMicroType === 'join' && pageNum === pageNumber"
    />
  </notebook-page>
</template>

<script>
import JoinElements from "@/components/booklayout/JoinElements.vue";
import QuestionTitleElements from "@/components/booklayout/QuestionTitleElements.vue";
import ReadElements from "@/components/booklayout/ReadElements.vue";
import QuestionElements from "@/components/booklayout/QuestionElements.vue";
import ChoiceElements from "@/components/booklayout/ChoiceElements.vue";
import ChapterTitleElements from "@/components/booklayout/ChapterTitleElements.vue";

import NotebookPage from "@/components/booklayout/NotebookPage.vue";

import { mapGetters } from "vuex";

export default {
  props: ["pageNum"],
  data() {
    return {};
  },
  components: {
    JoinElements,
    QuestionTitleElements,
    ReadElements,
    QuestionElements,
    ChoiceElements,
    ChapterTitleElements,

    NotebookPage,
  },
  computed: {
    ...mapGetters(["pageType", "pageMicroType", "pageNumber"]),
  },
};
</script>