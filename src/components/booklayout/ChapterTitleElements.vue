 <template>
  <div class="h1c">
    {{ "Chapter " + chapterNumber(pageNum) }}
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
  methods: {},
  mounted() {
    // this.$store.dispatch("setPageType", "questiontitle");
  },
  dismounted() {},
  computed: {
    ...mapGetters(["chapterNumber", "mainText"]),
  },
};
</script>

<style scoped>
</style>