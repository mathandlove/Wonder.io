<template v-else>
  <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
  <div class="centeredChoiceText"
       :style="{top: this.$store.state.AspectRatio > 2 ? '20%' : '15%'}">
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
  left: 49%;
  transform: translate(-50%);
  width: 100vh;
  max-width: min(38vh,67vw);
}
.ChoiceTitleSize {
  text-align: left;
  font-size: min(7vh,12.5vw);
  padding-bottom: min(5vh,9vw);
}
.ChoiceTextSize {
  text-align: left;
  font-size: min(3vh,5vw);
  max-width: min(45vh,81vw);
}
.choiceButtonFormat {
  display: flex;
  justify-content: flex-start;
  text-align: left;
  font-size: min(2.2vh,4vw);
  padding-top: min(1.2vh,2vw);
  padding-bottom: min(1vh,1.8vw);
  padding-left: min(1vh,3.6vw);
  margin-top: min(1vh,1.8vw);
  margin-bottom: min(1vh,1.8vw);
  min-height: min(4vh,7.2vw);
  width: 95%;
  border-style: solid;
  border-width: 4px;
  border-radius: 30px;
  border-color: #9cd4d4;
  background-color: white;
}
</style>
