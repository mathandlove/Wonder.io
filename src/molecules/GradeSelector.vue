<template>
  <img
    class="GradeWide"
    :src="require(`../assets/Images/${Grade}.svg`)"
    @click="handleGradeDispatch"
    alt=""
  />
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
      this.$gtag.event('grade_selected', { event_category: 'GradeLevel', grade: this.Grade, event_label: 'Grade Selected' });
      this.$store.dispatch("setGradeFilter", this.Grade).then(() => {
        this.$router.push("/books");
      });
    },
  },
};
</script>

<style scoped>
.GradeWide {
  height: 100%;
  width: 100%;
  object-fit: contain;
}
.GradeWide:hover {
  cursor: pointer;
  transform: scale(1.1);
  z-index: 1;
  height: 100%;
  width: 100%;
}
</style>
