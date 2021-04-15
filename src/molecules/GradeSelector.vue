<template>
  <div class="d-inline-flex align-items-center justify-content-center">
    <img :class="[this.$store.state.AspectRatio > 1 ? this.$store.state.AspectRatio > 1.5 ?
          'GradeTall' : 'GradeMid' : 'GradeWide']"
         :src="require(`../assets/Images/Grade${Grade}.svg`)"
         @click="handleGradeDispatch" alt="" />
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
.GradeTall {
  height: auto;
  width: 28vw;
}
.GradeMid {
  height: auto;
  width: 25vw;
}
.GradeWide {
  height: auto;
  width: min(16vw,32vh);
}
.GradeTall:hover,.GradeMid:hover,.GradeWide:hover {
  cursor: pointer;
  transform: scale(1.1);
  z-index: 1;
}
</style>
