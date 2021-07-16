<template>{{ displayNumber }}</template>
<script>
export default {
  props: { number: { default: 4 }, baseNumber: { default: 8 } },
  data() {
    return {
      displayNumber: 0,
      interval: false,
    };
  },

  mounted() {
    this.displayNumber = this.baseNumber;
    this.createInterval();
  },
  methods: {
    createInterval() {
      clearInterval(this.interval);

      if (this.number == this.displayNumber) {
        return;
      }
      this.interval = window.setInterval(() => {
        if (this.displayNumber != this.number) {
          var change = 50;
          change = change >= 0 ? Math.ceil(change) : Math.floor(change);
          this.displayNumber = Math.min(
            this.displayNumber + change,
            this.number
          );

          if (this.displayNumber == this.number) {
            clearInterval(this.interval);
          }
        }
      }, 20);
    },
  },
  watch: {
    number() {
      this.createInterval();
    },
  },
};
</script>