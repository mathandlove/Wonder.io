<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
  <div class="centeredQuestionTitle">
    <div class="pb-4 fontSizeQuestionTitle">Question</div>
    <div class="fontSizeQuestionText">{{question}}</div>
  </div>
</template>

<script>
export default {
  props: {
    question: {
      type: String,
      required: true,
    },
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
