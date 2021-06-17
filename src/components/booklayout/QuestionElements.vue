 <template>
  <div class="questionNumber">{{ "Question " + questionNumber + ":" }}</div>
  <div class="questionText">{{ mainText }}</div>
  <div class="answerContainer">
    <button
      v-for="(answerB, index) in answerArray"
      :key="answerB.name"
      class="answerButton"
      :class="{
        wrongClicked: answerB.clickedOn && !answerB.isCorrect,
        rightClicked: answerB.clickedOn && answerB.isCorrect,
      }"
      @click="answerClicked(index)"
      :disabled="answerB.clickedOn"
    >
      {{ answerB.name }}
    </button>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
export default {
  data() {
    return {};
  },
  components: {},
  methods: {
    setupNIV() {},
  },
  mounted() {},
  dismounted() {},
  computed: {
    ...mapGetters(["questionNumber", "mainText", "answerArray"]),
  },
  methods: {
    answerClicked(index) {
      this.$store.dispatch("SetAnswerClicked", index);
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
</style>