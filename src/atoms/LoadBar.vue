<template>
  <div class="LoadBarStyle"
       :style="{background:`linear-gradient(to right, #60aca9 0%, #60aca9 ${this.progressPercent}%,
                #FFFFFF ${this.progressPercent}%, #FFFFFF 100%)`}">
    {{ timerText }} in {{ this.ReturnSeconds }}s
  </div>
</template>

<script>
export default {
  emits: ['LoadDone', 'load-done'],
  props: {
    timerLength: {
      type: String,
      required: true,
    },
    timerText: {
      type: String,
      required: true,
    },
  },
  data() {
    const progressPercent = 0;
    let timerUnsubscribe;
    return { progressPercent, timerUnsubscribe };
  },
  methods: {
    UpdatePercent() {
      if (this.progressPercent === 100) {
        clearInterval(this.timerUnsubscribe);
        this.$emit('load-done');
      } else {
        this.progressPercent += 1;
      }
    },
  },
  computed: {
    ReturnSeconds() {
      const LeftOverTime = ((100 - this.progressPercent) / 100) * +this.timerLength;
      return Math.ceil(LeftOverTime);
    },
  },
  created() {
    this.timerUnsubscribe = setInterval(this.UpdatePercent, 10 * +this.timerLength);
  },
};
</script>

<style scoped>
.LoadBarStyle {
  font-family: "Roboto",serif;
  height: 4vh;
  font-size: min(2vh,3.5vw);
  padding-top: 0.2vh;
  width: 60%;
  margin-left: 20%;
  color: black;
  border-style: solid;
  border-color: black;
  border-radius: 15px;
  box-shadow: 3px 3px black;
}
</style>
