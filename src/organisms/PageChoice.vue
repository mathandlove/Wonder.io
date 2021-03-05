<template v-else>
  <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
  <div class="centeredChoiceText">
    <div class="ChoiceTitleSize">
      Your Choice:
    </div>
    <div v-if="this.data[0]" class="ChoiceTextSize">
      {{this.data[0].lineParts[0].words.join(' ')}}
    </div>
    <div v-for:="(choice,index) in AnswerArray">
      <button class="button choiceButtonFormat" @click="choiceClick(index)">
        {{ choice }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['ChosenPage', 'chosen-page', 'ShowHand', 'show-hand'],
  props: {
    data: {
      type: Array,
      required: true,
    },
  },
  data() {
    const AnswerArray = [];
    return { AnswerArray };
  },
  created() {
    this.data[0].lineParts.forEach((item) => { this.AnswerArray.push(item.words.join(' ')); });
    this.AnswerArray.shift();
    this.$emit('show-hand', false);
  },
  methods: {
    choiceClick(index) {
      const newPage = +this.$store.state.BookPage + index + 1;
      this.$emit('chosen-page', newPage);
      this.$store.dispatch('setBookPage', newPage);
      this.$router.push(`/book/${this.$store.state.BookID}/${newPage}`);
    },
  },
};
</script>

<style scoped>
.centeredChoiceText {
  position: absolute;
  top: 13%;
  left: 49%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 38vh;
}
.ChoiceTitleSize {
  text-align: left;
  font-size: 7vh;
  padding-bottom: 5vh;
}
.ChoiceTextSize {
  text-align: left;
  font-size: 3vh;
  max-width: 45vh;
}
.choiceButtonFormat {
  display: flex;
  justify-content: flex-start;
  text-align: left;
  font-size: 2.2vh;
  padding-top: 1vh;
  padding-bottom: 1vh;
  padding-left: 2vh;
  margin-top: 1vh;
  margin-bottom: 1vh;
  min-height: 4vh;
  width: 95%;
  border-style: solid;
  border-width: 4px;
  border-radius: 30px;
  border-color: #9cd4d4;
  background-color: white;
}
</style>
