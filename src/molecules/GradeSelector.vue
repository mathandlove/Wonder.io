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
}
.GradeWide:hover {
  cursor: pointer;
  transform: scale(1.1);
  z-index: 1;
  height: 100%;
  width: 100%;
}
</style>
