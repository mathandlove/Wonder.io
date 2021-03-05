<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadPartialTornNoLines.png"/>
  <div class="centeredQuestionTitle fontSizeQuestionTitle">
    <div v-if="this.data[0].questionId===-99">
      <div>THE BIG QUESTION:</div>
    </div>
    <div v-else class="pb-4">
      <strong>Question {{counter}}:</strong>
    </div>
    <div v-for="pagePart in this.data" :key="pagePart" class="fontsizeQuestionText">
      {{pagePart.lineParts[0].words.join(" ")}}
    </div>
  </div>
</template>

<script>
export default {
  emits: ['ShowHand', 'show-hand'],
  props: {
    data: {
      type: Array,
      required: true,
    },
    counter: {
      type: Number,
    },
  },
  created() {
    this.$emit('show-hand', true);
  },
};
</script>

<style scoped>
.centeredQuestionTitle {
  position: absolute;
  top: 20vh;
  left: 50%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 38vh;
}
.fontSizeQuestionTitle {
  font-size: 6vh;
}
.fontsizeQuestionText {
  font-size: 5vh;
}
</style>
