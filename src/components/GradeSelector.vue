<template>
  <div class="bubble d-inline-flex align-items-center justify-content-center text-white"
       :style="{background: Grade.color}"
       @click="handleGradeDispatch">
    <div>
        <h5 class="customBorder textSize">{{ Grade.top }}</h5>
        <h1 class="customBorder textSize">{{ Grade.mid }}</h1>
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
@media (max-width: 767px) {
  .bubble {
    width: 7rem;
    height: 7rem;
  }
  h1 {
    font-size: 25px;
  }
  h5 {
    font-size: 10px;
  }
}
@media (min-width: 768px) {
  .bubble {
    width: 10rem;
    height: 10rem;
  }
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
</style>
