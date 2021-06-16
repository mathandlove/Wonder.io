 <template>
  <div class="h1c">Question {{ NIV.questionNumber }}:</div>
  <div class="LargeBodyText" style="text-align: center">
    <slot>{{ NIV.mainText }}</slot>
  </div>
</template>
<script>
export default {
  components: {},
  inject: ["NIV"],
  methods: {
    setupNIV() {},
  },
  mounted() {},
  dismounted() {},
};
</script>

<style scoped>
</style>