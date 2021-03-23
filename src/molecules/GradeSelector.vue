<template>
  <div class="d-inline-flex align-items-center justify-content-center">
    <img alt="" class="cardFormat"
         :src="require(`../assets/Images/Grade${Grade}.svg`)"
         @click="handleGradeDispatch"/>
  </div>
</template>

<script>
export default {
  props: {
    Grade: {
      type: String,
      required: true,
    },
  },
  methods: {
    handleGradeDispatch() {
      this.$store.dispatch('setGradeFilter', this.Grade).then(() => {
        this.$router.push('/books');
      });
    },
  },
};
</script>

<style scoped>
.cardFormat {
  width: auto;
  height: min(18vh,31vw);
}
.cardFormat:hover {
  cursor: pointer;
  transform: scale(1.1);
  z-index: 1;
}
</style>
