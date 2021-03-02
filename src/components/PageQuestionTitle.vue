<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadPartialTornNoLines.png"/>
  <div class="centeredQuestionTitle fontSizeQuestionTitle">
    <div class="pb-4"><strong>Question ?:</strong></div>
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
