 <template>
  <div class="questionNumber">{{ "Question " + questionNumber + ":" }}</div>
  <div class="questionText">{{ mainText }}</div>
  <div v-bind:class="{ 
    questionImgContainer: this.answerArray[0].lineType == 'answerCoords',
    answerContainer: this.answerArray[0].lineType == 'answers'
   }">
    <div v-for="(answer, index) in answerArray"
      :key="answer">
    <button
      v-if="answer.text" 
      class="answerButton"
      :class="{
        wrongClicked: answer.clickedOn && !answer.isCorrectAnswer,
        rightClicked: answer.clickedOn && answer.isCorrectAnswer,
      }"
      @click="answerClicked(index)"
      :disabled="answer.disabled"
    >
      {{ answer.text }}
    </button>
   <button
      v-if="answer.answerCoords" 
      class="answerImgButton"
      :class="{ correctImageAnswer: answer.isCorrectAnswer }"
      :style="{
        left: (answer.answerCoords[0] / Baseline.width) * 100 + '%',
        top: ((-1 * answer.answerCoords[1]) / Baseline.height) * 100 + '%',
        width: (answer.answerCoords[2] / Baseline.width) * 100 + '%',
        height: (answer.answerCoords[3] / Baseline.height) * 100 + '%',
      }"
      @click="answerClicked(index)"
      :disabled="answer.disabled"
    >
      <img
        v-if="answer.clickedOn && answer.isCorrectAnswer"
        class="w-100 h-100"
        :src="require(`@/assets/Images/Circle.png`)"
      />
      <img
        v-else-if="answer.clickedOn && !answer.isCorrectAnswer"
        class="w-100 h-100"
        :src="require(`@/assets/Images/X.png`)"
      />
    </button>
  </div>
   <img v-if="showQuestionImage" :src="questionImageUrl" id="questionImage" />
      
  </div>
</template>
<script>
import { mapActions, mapGetters } from "vuex";
export default {
  data() {
    const Baseline = {
      width: 1161,
      height: 922.5,
    };
    return {
      Baseline,
      answerContainerId: "questionImgContainer"
    };
  },
  mounted() {
    // this.$store.dispatch("setPageStyle", "question");
  },
  dismounted() {},
  computed: {
    ...mapGetters([
      "questionNumber",
      "mainText",
      "answerArray",
      "showQuestionImage",
      "questionImageUrl",
    ]),
  },
  methods: {
    ...mapActions(["setPageStyle"]),
    answerClicked(index) {
      this.$store.dispatch("setAnswerClicked", index);
    },
  },
};
</script>

<style scoped>
.questionNumber {
  text-align: left;
  font-size: 1.8em;
  line-height: 1;
  padding-top: 1em;
  font-weight: 700;
  margin-bottom: 0.25em;
}

.answerContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: start;
  margin-top: 1em;
}

.answerButton {
  display: flex;
  justify-content: flex-start;
  text-align: left;
  font-size: 0.7em;
  color: black;
  font-weight: 300;
  line-height: 2.2em;
  padding-left: 1em;
  margin-bottom: 1em;
  width: 90%;
  background-color: white;
  border-style: solid;
  border-color: #9cd4d4;
  border-width: 4px;
  border-radius: 30px;
  font-family: Roboto;
  outline: none;
}

.answerButton:hover:not([disabled]) {
  cursor: pointer;
  background-color: #9cd4d4;
}

.wrongClicked {
  border-color: #fc7574;
  background-color: white;
}
.rightClicked {
  background-color: #9cd4d4;
}
#questionImage {
  height: 5 * 1.4 em;
  width: 100%;
  object-fit: contain;
}
.questionImgContainer {
  width: 100%;
  position: relative;
}

.answerImgButton {
  position: absolute;
  transform: translate(-50%, -50%);
  background-color: #00000000;
  min-width: 0px;
  padding-left: 0;
  padding-right: 0;
  margin: 0;
  outline: none;
}
.correctImageAnswer {
  z-index: 2;
}
</style>