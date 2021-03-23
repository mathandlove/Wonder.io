<template>
  <img class="PrevArrowSize PrevArrowAlign" alt="" src="../assets/Images/computerBack.png"
       @click="this.$emit('prev-page')"
       v-if="+this.$store.state.BookPage!==1"
       :style="{left: this.$store.state.AspectRatio > 2
           ? windowWidth/2-windowHeight*0.19+'px'
           : windowWidth/2-windowHeight*0.24+'px'}"/>
</template>

<script>
export default {
  emits: ['PrevPage','prev-page'],
  data() {
    let windowWidth = 1;
    let windowHeight = 1;
    return { windowWidth, windowHeight };
  },
  created() {
    window.addEventListener('resize',this.handleResize);
    this.handleResize();
  },
  unmounted() {
    window.removeEventListener('resize',this.handleResize);
  },
  methods: {
    handleResize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
    },
  },
};
</script>

<style scoped>
.PrevArrowAlign {
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);
}
.PrevArrowSize {
  width: auto;
  height: min(5vh,9vw)
}
</style>
