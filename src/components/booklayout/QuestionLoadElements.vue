 <template>
  <div class="questionNumber">
    {{ "Question " + questionNumber(pageNum) + ":" }}
  </div>
  <div class="questionText">{{ mainText(pageNum) }}</div>
  <div id="loader">
    <LoadBar v-if="pageNum == pageNumber" @load-done="questionLoadDone" />
    <img
      id="doublepoints"
      src="@/assets/Images/DoublePoints.svg"
      :class="{ makeInvisible: !isDoublePoints(pageNum) }"
    />
  </div>
</template>
<script>
import { mapActions, mapGetters } from "vuex";
import LoadBar from "@/atoms/LoadBar.vue";
export default {
  components: { LoadBar },
  props: ["pageNum"],
  data() {
    return {};
  },
  mounted() {
    // this.$store.dispatch("setPageStyle", "question");
  },
  dismounted() {},
  computed: {
    ...mapGetters([
      "questionNumber",
      "mainText",
      "isDoublePoints",
      "pageNumber",
    ]),
  },
  methods: {
    ...mapActions(["setPageStyle", "questionLoadDone"]),
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

.questionText {
  margin-top: 2em;
}

#loader {
  position: absolute;
  bottom: 0%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 0.3em;
}
#doublepoints {
  height: 4em;
  margin: 1em;
}
.makeInvisible {
  opacity: 0;
}
</style>