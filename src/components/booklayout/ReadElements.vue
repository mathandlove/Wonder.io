 <template>
  <div class="mainText">
    {{ textSeries + textSeries }}
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
    ...mapGetters(["textSeries"]),
  },
};
</script>

<style scoped>
.mainText {
  white-space: pre-line;
}
</style>