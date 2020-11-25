<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
  <div class="questionAlign">
    <div class="pb-4 QuestionTitleSize">Question</div>
    <div v-if="questionData.question" class="QuestionTextSize">{{questionData.question}}</div>
    <img v-if="questionData.image" alt="" class="w-100"
         :src="require(`../assets/Books/book${bookNumber}/images/${questionData.image}.png`)"/>
    <p v-if="questionData.answerCoords">{{questionData.answerCoords}}</p>
  </div>
</template>

<script>
export default {
  props: {
    questionData: {
      type: Object,
      required: true,
    },
    bookNumber: {
      type: String,
      required: true,
    },
  },
};
</script>

<style scoped>
.questionAlign {
  position: absolute;
  top: 14.5vh;
  left: 50%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 45vh;
}
.QuestionTitleSize {
  font-size: 6vh;
}
.QuestionTextSize {
  font-size: 3vh;
  max-width: 45vh;
}
</style>
