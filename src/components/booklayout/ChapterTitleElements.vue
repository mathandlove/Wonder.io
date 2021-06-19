 <template>
  <div class="h1c">
    {{ "Chapter " + questionNumber }}
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
  mounted() {
    // this.$store.dispatch("setPageType", "questiontitle");
  },
  dismounted() {},
  computed: {
    ...mapGetters(["questionNumber", "mainText"]),
  },
};
</script>

<style scoped>
</style>