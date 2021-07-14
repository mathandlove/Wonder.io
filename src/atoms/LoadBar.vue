<template>
  <div
    class="LoadBarStyle"
    :style="{
      background: `linear-gradient(to right, #60aca9 0%, #60aca9 ${this.progressPercent}%,
                #FFFFFF ${this.progressPercent}%, #FFFFFF 100%)`,
    }"
  ></div>
</template>

<script>
export default {
  data() {
    const progressPercent = 0;
    let timerUnsubscribe;
    return { progressPercent, timerUnsubscribe, timerLength: 4 };
  },
  methods: {
    UpdatePercent() {
      if (this.progressPercent === 100) {
        clearInterval(this.timerUnsubscribe);
        this.$emit("load-done");
      } else {
        this.progressPercent += 1;
      }
    },
  },
  computed: {
    ReturnSeconds() {
      const LeftOverTime =
        ((100 - this.progressPercent) / 100) * +this.timerLength;
      return Math.ceil(LeftOverTime);
    },
  },
  mounted() {
    this.timerUnsubscribe = setInterval(
      this.UpdatePercent,
      10 * +this.timerLength
    );
  },
  unmounted() {
    clearInterval(this.timerUnsubscribe);
  },
};
</script>

<style scoped>
.LoadBarStyle {
  height: 1.5em;
  padding-top: 0.2vh;
  width: 50%;
  margin-left: 20%;
  color: black;
  border-style: solid;
  border-color: black;
  border-radius: 100px;
  box-shadow: 3px 3px black;
  transform: translate(-25%, 0);
}
</style>
