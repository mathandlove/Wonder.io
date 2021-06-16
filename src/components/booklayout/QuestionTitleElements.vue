 <template>
  <div class="h1c">
    {{
      questionNumber != -99
        ? "Question " + questionNumber + ":"
        : "The Big Question:"
    }}
  </div>
  <div class="LargeBodyText" style="text-align: center">
    <slot>{{ mainText }}</slot>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
export default {
  components: {},
  methods: {
    setupNIV() {},
  },
  mounted() {},
  dismounted() {},
  computed: {
    ...mapGetters(["questionNumber", "mainText"]),
  },
};
</script>

<style scoped>
</style>