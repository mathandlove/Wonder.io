 <template>
  <div class="h1c">
    {{
      questionNumber(pageNumber) != -99
        ? "Question " + questionNumber(pageNumber) + ":"
        : "The Big Question:"
    }}
  </div>
  <div class="LargeBodyText" style="text-align: center">
    <slot>{{ mainText(pageNumber) }}</slot>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
export default {
  components: {},
  props: ["pageNumber"],
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