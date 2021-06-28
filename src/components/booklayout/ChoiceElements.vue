 <template>
  <div class="questionNumber">Your Choice:</div>
  <div class="questionText">{{ mainText }}</div>
  <div class="answerContainer">
    <button
      v-for="answerB in answerArray"
      :key="answerB.text"
      class="answerButton"
      @click="updateChoice(answerB.toPages)"
    >
      {{ answerB.text }}
    </button>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
export default {
  data() {
    return {};
  },
  methods: {
    updateChoice(skipVal) {
      this.$store.dispatch("setChoiceClicked", skipVal);
      this.$store.dispatch("gotoNext");
    },
  },
  mounted() {},
  dismounted() {},
  computed: {
    ...mapGetters(["mainText", "answerArray"]),
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