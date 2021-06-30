<template>
  <notebook-page>
    <question-title-elements
      v-if="pageType(pageNum) === 'questiontitle'"
      :pageNum="pageNum"
      v-show="pageNum == pageNumber"
    />
    <read-elements
      v-else-if="pageType(pageNum) === 'read'"
      :pageNum="pageNum"
    />
    <question-elements
      v-else-if="pageType(pageNum) === 'question'"
      :pageNum="pageNum"
      v-show="pageNum == pageNumber"
    />
    <choice-elements
      v-else-if="pageType(pageNum) === 'choice'"
      :pageNum="pageNum"
      v-show="pageNum == pageNumber"
    />
    <chapter-title-elements
      v-else-if="pageType(pageNum) === 'chapterTitle'"
      :pageNum="pageNum"
      v-show="pageNum == pageNumber"
    />
    <end-elements
      v-else-if="pageType(pageNum) === 'end' && pageNum === pageNumber"
      :pageNum="pageNum"
      v-show="pageNum == pageNumber"
    />
    <join-elements
      v-else-if="pageMicroType === 'join' && pageNum === pageNumber"
      v-show="pageNum == pageNumber"
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
import EndElements from "@/components/booklayout/EndElements.vue";
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
    EndElements,
    NotebookPage,
  },
  computed: {
    ...mapGetters(["pageType", "pageMicroType", "pageNumber"]),
  },
};
</script>