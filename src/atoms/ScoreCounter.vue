<template>
  <div>
    {{ Math.round(currentPoints) }}
  </div>
</template>

<script>
export default {
  props: {
    pointsStart: {
      type: Number,
      required: true,
    },
    pointsEnd: {
      type: Number,
      required: true,
    },
  },
  data() {
    const currentPoints = this.pointsStart;
    let timerUnsubscribe;
    return { currentPoints, timerUnsubscribe };
  },
  methods: {
    UpdatePoints() {
      const PointsCounter = (this.pointsEnd - this.pointsStart) / 100;
      if (this.currentPoints >= +this.pointsEnd) {
        clearInterval(this.timerUnsubscribe);
      } else {
        this.currentPoints += PointsCounter;
      }
    },
  },
  created() {
    this.timerUnsubscribe = setInterval(this.UpdatePoints, 15);
  },
};
</script>

<style scoped>

</style>
