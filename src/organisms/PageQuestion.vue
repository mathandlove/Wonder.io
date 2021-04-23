<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"/>
  <div v-if="this.AnswerValue===true">
    <div class="animation centeredImage"/>
    <img alt="" class="centeredImage fadeOpacityImage" src="../assets/Images/D3.png"/>
    <div class="centeredAnswerText fadeOpacityWord">
      <h1 class="fontSizeAnswer">Correct!</h1>
    </div>
  </div>
  <div v-else-if="this.AnswerValue===false">
    <div class="animation centeredImage"/>
    <img alt="" class="centeredImage fadeOpacityImage" src="../assets/Images/W3.png"/>
    <div class="centeredAnswerText fadeOpacityWord">
      <h1 class="fontSizeAnswer">Wrong!</h1>
    </div>
  </div>
  <div v-else>
    <div class="questionAlign maxWidth">
      <div class="QuestionTitleSize text-left">
        Question {{ counter }}:
      </div>
      <div v-if="this.data[0]" class="QuestionSize text-left">
        {{this.data[0].lineParts[0].words.join(' ')}}
      </div>
      <LoadBar v-if="showLoadBar && AnswerArray[0].name" @load-done="this.showLoadBar=false"
               timer-text="Loading Questions" timer-length="3" class="mt-4"/>
      <div v-else v-for:="(choice,index) in AnswerArray">
        <button v-if="choice.name" class="button buttonFormat"
                :disabled="choice.clickedOn || this.allDisabled"
                @click="choiceClick(index)">
          {{ choice.name.join(" ") }}
        </button>
        <button v-if="!choice.name && this.$store.state.AspectRatio < 2"
                class="buttonFixed border-0 bg-transparent"
                :style="{
                    left: 50+(choice.coords[0]-Baseline.centerX)/Baseline.width*125+'%',
                    top: 139-(choice.coords[1]-Baseline.centerY)/Baseline.height*330+'%',
                    width: choice.coords[2]/Baseline.width*125+'%',
                    height: choice.coords[3]/Baseline.height*330+'%',
                }"
                :disabled="choice.clickedOn || this.allDisabled"
                @click="choiceClick(index)">
          <img v-if="choice.clickedOn && choice.value" class="w-100 h-100"
               :src="require(`../assets/Images/Circle.png`)"/>
          <img v-else-if="choice.clickedOn && !choice.value" class="w-100 h-100"
               :src="require(`../assets/Images/X.png`)"/>
        </button>
        <button v-if="!choice.name && this.$store.state.AspectRatio > 2"
                class="buttonFixed border-0 bg-transparent"
                :style="{
                    left: 52+(choice.coords[0]-Baseline.centerX)/Baseline.width*125+'%',
                    top: 145-(choice.coords[1]-Baseline.centerY)/Baseline.height*440+'%',
                    width: choice.coords[2]/Baseline.width*130+'%',
                    height: choice.coords[3]/Baseline.height*400+'%',
                }"
                :disabled="choice.clickedOn || this.allDisabled"
                @click="choiceClick(index)">
          <img v-if="choice.clickedOn && choice.value" class="w-100 h-100"
               :src="require(`../assets/Images/Circle.png`)"/>
          <img v-else-if="choice.clickedOn && !choice.value" class="w-100 h-100"
               :src="require(`../assets/Images/X.png`)"/>
        </button>
      </div>
    </div>
    <img v-if="this.data[0].partImageUrl !== '0'"
         :src="require(`../assets/Books/book${this.$store.state.BookID}/images/${
              this.data[0].partImageUrl}.png`)"
         alt=""
         class="w-100 imageCenter maxWidth"
         :style="{height: this.data[0].totalLines*5+'vh'}"/>

  </div>
</template>

<script>
import LoadBar from '../atoms/LoadBar.vue';

export default {
  components: { LoadBar },
  emits: ['ShowHand', 'show-hand'],
  props: {
    data: {
      type: Array,
      required: true,
    },
    counter: {
      type: Number,
      required: false,
    },
  },
  data() {
    const showLoadBar = true;
    const AnswerArray = [
      {
        name: this.data[0].lineParts[1].words,
        value: this.data[0].lineParts[1].isCorrectAnswer,
        coords: this.data[0].lineParts[1].answerCoords,
        clickedOn: false,
      },
      {
        name: this.data[0].lineParts[2].words,
        value: this.data[0].lineParts[2].isCorrectAnswer,
        coords: this.data[0].lineParts[2].answerCoords,
        clickedOn: false,
      },
      {
        name: this.data[0].lineParts[3].words,
        value: this.data[0].lineParts[3].isCorrectAnswer,
        coords: this.data[0].lineParts[3].answerCoords,
        clickedOn: false,
      },
      {
        name: this.data[0].lineParts[4].words,
        value: this.data[0].lineParts[4].isCorrectAnswer,
        coords: this.data[0].lineParts[4].answerCoords,
        clickedOn: false,
      },
    ];
    let AnswerValue;
    let allDisabled;
    const Baseline = {
      centerX: 629, centerY: -337, width: 1491, height: 2598,
    };
    const wrongCounter = 0;
    const soundClap = new Audio(require('../assets/sounds/woodclap.wav'));
    const soundCorrect = new Audio(require('../assets/sounds/274178__littlerobotsoundfactory__jingle-win-synth-02.wav'));
    const soundApplause = new Audio(require('../assets/sounds/audienceClap.wav'));
    const soundStart = new Audio(require('../assets/sounds/387232__isteak__badge-coin-win.wav'));
    const soundFail = new Audio(require('../assets/sounds/FailHonkShort2.mp3'));
    return {
      showLoadBar,
      AnswerArray,
      AnswerValue,
      allDisabled,
      soundClap,
      soundCorrect,
      soundApplause,
      soundStart,
      soundFail,
      Baseline,
      wrongCounter,
    };
  },
  methods: {
    choiceClick(index) {
      this.AnswerArray[index].clickedOn = true;
      this.allDisabled = this.AnswerArray[index].value;
      this.AnswerValue = this.AnswerArray[index].value;
      setTimeout(() => { this.AnswerValue = null; }, 6000);
      setTimeout(() => { this.soundStart.play(); }, 500);
      setTimeout(() => { this.soundClap.play(); }, 1000);
      setTimeout(() => { this.soundClap.play(); }, 2000);
      setTimeout(() => { this.soundClap.play(); }, 3000);
      if (this.AnswerArray[index].value) {
        const tempPage = +this.$store.state.BookPage + 1;
        if (tempPage > this.$store.state.HighestPage) {
          this.$store.dispatch('setHighestPage', tempPage);
        }
        this.$store.dispatch('setBookPage', tempPage);
        setTimeout(() => { this.soundCorrect.play(); }, 4400);
        setTimeout(() => { this.soundApplause.play(); }, 4800);
        setTimeout(() => { this.soundApplause.pause(); }, 5750);
        setTimeout(() => {
          this.$router.push({ name: 'Scoreboard', params: { wrongAnswers: this.wrongCounter } });
        }, 5750);
      } else {
        this.wrongCounter += 1;
        setTimeout(() => { this.soundFail.play(); }, 4400);
      }
    },
  },
  created() {
    this.$emit('show-hand', false);
  },
};
</script>

<style scoped>
.maxWidth {
  max-width: min(38vh,67vw);
}
.questionAlign {
  z-index: 1;
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translate(-50%);
  width: 100vh;
}
.imageCenter {
  z-index: 0;
  position: absolute;
  top: 65%;
  left: 49%;
  transform: translate(-50%, -50%);
}
.buttonFixed {
  position: fixed;
  transform: translate(-50%, -50%);
}
.QuestionTitleSize {
  font-size: min(6vh,10vw);
}
.QuestionSize {
  font-size: min(3.5vh,6.5vw);
  min-height: min(15vh,27vw);
}
.buttonFormat {
  display: flex;
  justify-content: flex-start;
  text-align: left;
  font-size: min(2.2vh,4vw);
  padding-top: min(1.2vh,2vw);
  padding-bottom: min(1vh,1.8vw);
  padding-left: min(3vh,5vw);
  margin-top: min(1vh,1.8vw);
  margin-bottom: min(1vh,1.8vw);
  min-height: min(4vh,7.2vw);
  width: 95%;
  background-color: white;
  border-style: solid;
  border-color: #9cd4d4;
  border-width: 4px;
  border-radius: 30px;
}
.buttonFormat:disabled {
  color: black;
  border-color: #fc7574;
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
  width: min(30vh,54vw);
  height: min(45vh,81vw);
  transform: translate(-50%, -50%);
}
.fontSizeAnswer {
  font-size: min(8vh,14vw);
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
