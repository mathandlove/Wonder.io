<template>
  <div class="bubble d-inline-flex align-items-center justify-content-center text-white"
       :style="{background: Grade.color}"
       @click="handleGradeDispatch">
    <div>
        <h5 class="customBorder">{{ Grade.top }}</h5>
        <h1 class="customBorder">{{ Grade.mid }}</h1>
    </div>
  </div>
</template>

<script>

export default {
  props: {
    Grade: Object,
  },
  methods: {
    handleGradeDispatch() {
      this.$store.dispatch('setBookFilter', this.Grade.id).then(() => {
        this.$router.push('/books');
      });
    },
  },
};
</script>

<style scoped>
.bubble {
  width: 10rem;
  height: 10rem;
  border-style: solid;
  border-color: black;
  border-width: 1px;
  border-radius: 5rem;
}
.customBorder {
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
}
</style>
