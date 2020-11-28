<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
  <div class="questionAlign">
    <div class="pb-4 QuestionTitleSize">Question</div>
    <div v-for="pagePart in this.data" :key="pagePart">
      <div v-if="pagePart.lineParts[0].words[0].includes('<im>')">
        <img :src="require(`../assets/Books/book${bookNumber}/images/${
                pagePart.lineParts[0].words[0].charAt(4)}.png`)"
             alt=""
             class="w-100"
             :style="{height: pagePart.lineParts[0].words[0].charAt(13)*5+'vh'}"/>
      </div>
      <div v-else class="pb-4 QuestionTextSize">{{pagePart.lineParts[0].words.join(" ")}}</div>
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
    bookNumber: {
      type: String,
      required: true,
    },
  },
  created() {
    console.log('Question_Page data is =', this.data);
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
