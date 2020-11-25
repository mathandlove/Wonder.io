<template>
  <div class="bubble d-inline-flex align-items-center justify-content-center text-white"
       :style="{background: Grade.color}"
       @click="handleGradeDispatch">
    <div>
        <div class="customBorder TopTextSize">{{ Grade.top }}</div>
        <div class="customBorder MidTextSize">{{ Grade.mid }}</div>
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
      this.$store.dispatch('setGradeFilter', this.Grade.id).then(() => {
        this.$router.push('/books');
      });
    },
  },
};
</script>

<style scoped>
.bubble {
  width: 12em;
  height: 12em;
  max-width: 24vh;
  max-height: 24vh;
}
.bubble {
  border-style: solid;
  border-color: black;
  border-width: 1px;
  border-radius: 50%;
}
.bubble:hover {
  text-underline: black;
  cursor: pointer;
  transform: scale(1.05);
  z-index: 1;
  border-color: white;
}
.customBorder {
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
}
.TopTextSize {
  font-size: 2.5vh;
}
.MidTextSize {
  font-size: 5vh;
}
</style>
