<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
  <div class="centeredQuestionTitle">
    <div class="pb-4 fontSizeQuestionTitle">Question</div>
    <div v-for="pagePart in this.data" :key="pagePart" class="fontSizeQuestionText">
      {{pagePart.lineParts[0].words.join(" ")}}
    </div>
  </div>
</template>

<script>
export default {
  props: {
    data: {
      type: Array,
      required: true,
    },
  },
  created() {
    console.log('Question_Title data is =', this.data);
  },
};
</script>

<style scoped>
.centeredQuestionTitle {
  position: absolute;
  top: 14.5vh;
  left: 50%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 45vh;
}
.fontSizeQuestionTitle {
  font-size: 6vh;
}
.fontSizeQuestionText {
  font-size: 3vh;
  max-width: 45vh;
}
</style>
