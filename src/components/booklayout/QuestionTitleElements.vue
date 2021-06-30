 <template>
  <div class="h1c">
    {{
      questionNumber(pageNum) != -99
        ? "Question " + questionNumber(pageNum) + ":"
        : "The Big Question:"
    }}
  </div>
  <div class="LargeBodyText" style="text-align: center">
    <slot>{{ mainText(pageNum) }}</slot>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
export default {
  components: {},
  props: ["pageNum"],
  mounted() {
    // this.$store.dispatch("setPageType", "questiontitle");
  },
  dismounted() {},
  computed: {
    ...mapGetters(["questionNumber", "mainText", "mainText"]),
  },
};
</script>

<style scoped>
</style>