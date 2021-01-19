<template>
  <template v-if="this.AnswerValue==true">
    <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
    <div class="animation centeredImage"/>
    <img alt="" class="centeredImage fadeOpacityImage" src="../assets/Images/D3.png"/>
    <div class="centeredAnswerText fadeOpacityWord">
      <h1 class="fontSizeAnswer">Correct!</h1>
    </div>
  </template>
  <template v-else-if="this.AnswerValue==false">
    <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
    <div class="animation centeredImage"/>
    <img alt="" class="centeredImage fadeOpacityImage" src="../assets/Images/W3.png"/>
    <div class="centeredAnswerText fadeOpacityWord">
      <h1 class="fontSizeAnswer">Wrong!</h1>
    </div>
  </template>
  <template v-else>
    <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
    <div class="questionAlign">
      <div class="QuestionTitleSize text-left">
        Question X:
      </div>
      <div v-if="this.data[0]" class="pb-2 QuestionSize text-left">
        {{this.data[0].lineParts[0].words.join(' ')}}
      </div>
      <img v-if="this.data[0].partImageUrl !== '0'"
           :src="require(`../assets/Books/book${bookNumber}/images/${
              this.data[0].partImageUrl}.png`)"
           alt=""
           class="w-100"
           :style="{height: this.data[0].totalLines*5+'vh'}"/>
      <div v-for:="(choice,index) in AnswerArray">
        <button v-if="choice.name" class="button buttonFormat"
                :style="{
                    backgroundColor: choice.clickedOn && choice.value  ? '#9cd4d4' : 'white',
                    borderColor: choice.clickedOn && !choice.value ? '#fc7574' : '#9cd4d4'}"
                :disabled="choice.clickedOn || this.allDisabled"
                @click="choiceClick(index)">
          {{ choice.name.join(" ") }}
        </button>
        <button v-if="!choice.name" class="button coordFormat"
                :style="{backgroundColor:
                choice.clickedOn ? choice.value ? 'aquamarine' : 'pink' : 'grey'}"
                :disabled="choice.clickedOn || this.allDisabled"
                @click="choiceClick(index)">
          Enter Answer Coords
        </button>
      </div>
    </div>
  </template>
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
  data() {
    const AnswerArray = [
      {
        name: this.data[0].lineParts[1].words,
        value: this.data[0].lineParts[1].isCorrectAnswer,
        clickedOn: false,
      },
      {
        name: this.data[0].lineParts[2].words,
        value: this.data[0].lineParts[2].isCorrectAnswer,
        clickedOn: false,
      },
      {
        name: this.data[0].lineParts[3].words,
        value: this.data[0].lineParts[3].isCorrectAnswer,
        clickedOn: false,
      },
      {
        name: this.data[0].lineParts[4].words,
        value: this.data[0].lineParts[4].isCorrectAnswer,
        clickedOn: false,
      },
    ];
    let AnswerValue;
    let allDisabled;
    const soundClap = new Audio(require('../assets/sounds/woodclap.wav'));
    const soundCorrect = new Audio(require('../assets/sounds/274178__littlerobotsoundfactory__jingle-win-synth-02.wav'));
    const soundApplause = new Audio(require('../assets/sounds/audienceClap.wav'));
    const soundStart = new Audio(require('../assets/sounds/387232__isteak__badge-coin-win.wav'));
    const soundFail = new Audio(require('../assets/sounds/FailHonkShort2.mp3'));
    return {
      AnswerArray,
      AnswerValue,
      allDisabled,
      soundClap,
      soundCorrect,
      soundApplause,
      soundStart,
      soundFail,
    };
  },
  methods: {
    choiceClick(index) {
      this.AnswerArray[index].clickedOn = true;
      this.allDisabled = this.AnswerArray[index].value;
      this.AnswerValue = this.AnswerArray[index].value;
      setTimeout(() => { this.AnswerValue = null; }, 5750);
      setTimeout(() => { this.soundStart.play(); }, 500);
      setTimeout(() => { this.soundClap.play(); }, 1000);
      setTimeout(() => { this.soundClap.play(); }, 2000);
      setTimeout(() => { this.soundClap.play(); }, 3000);
      if (this.AnswerArray[index].value) {
        setTimeout(() => { this.soundCorrect.play(); }, 4400);
        setTimeout(() => { this.soundApplause.play(); }, 4800);
        setTimeout(() => { this.soundApplause.pause(); }, 5750);
      } else {
        setTimeout(() => { this.soundFail.play(); }, 4400);
      }
    },
  },
  created() {
    console.log('Question page =', this.data);
  },
};
</script>

<style scoped>
.questionAlign {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 38vh;
}
.QuestionTitleSize {
  font-size: 6vh;
}
.QuestionSize {
  font-size: 3.5vh;
}
.buttonFormat {
  text-align: left;
  font-size: 2.2vh;
  padding: 1vh;
  margin: 1vh;
  min-height: 4vh;
  width: 100%;
  border-style: solid;
  border-width: 4px;
  border-radius: 30px;
}
.coordFormat {
  font-size: 1.5vh;
  margin: 0.5vh;
  height: 3vh;
}
.centeredAnswerText {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.centeredImage {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30vh;
  height: 45vh;
  transform: translate(-50%, -50%);
}
.fontSizeAnswer {
  font-size: 8vh;
}
.animation {
  background-size: cover;
  animation: changeBg;
  animation-duration: 5s;
}
@keyframes changeBg {
  0% {background-image: url("../assets/Images/D0.png");}
  20% {background-image: url("../assets/Images/D0.png");}
  40% {background-image: url("../assets/Images/D1.png");}
  60% {background-image: url("../assets/Images/D2.png");}
}
.fadeOpacityImage {
  opacity: 0;
  animation: changeOpacityImage;
  animation-duration: 5s;
}
@keyframes changeOpacityImage {
  0% {opacity: 0}
  60% {opacity: 0}
  80% {opacity: 1}
  100% {opacity: 1}
}
.fadeOpacityWord {
  opacity: 0;
  animation: changeOpacityWord;
  animation-duration: 5s;
}
@keyframes changeOpacityWord {
  0% {opacity: 0}
  87% {opacity: 0}
  88% {opacity: 1}
  100% {opacity: 1}
}

</style>
