<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
  <div class="centeredTitleText">
    <h1 v-if="chapterNumber" class="pb-4 fontSizeChapterTitle">
      Chapter {{chapterNumber}}
    </h1>
    <h3 v-if="pageText" class="fontSizeChapterText">{{pageText}}</h3>
  </div>
</template>

<script>
export default {
  emits: ['ShowHand', 'show-hand'],
  props: {
    pageText: {
      type: String,
      required: true,
    },
    chapterNumber: {
      type: Number,
      required: true,
    },
  },
  created() {
    this.$emit('show-hand', true);
  },
};
</script>

<style scoped>
.centeredTitleText {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.fontSizeChapterTitle {
  font-size: 6vh;
}
.fontSizeChapterText {
  font-size: 4vh;
  max-width: 45vh;
}
</style>
