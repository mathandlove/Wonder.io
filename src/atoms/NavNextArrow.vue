<template>
  <img class="NextArrowSize NextArrowAlign" alt="" src="../assets/Images/nextButton.png"
       @click="this.$emit('next-page')"
       :style="{left: this.$store.state.AspectRatio > 2
           ? windowWidth/2+windowHeight*0.18+'px'
           : windowWidth/2+windowHeight*0.23+'px'}"/>
</template>

<script>
export default {
  emits: ['NextPage','next-page'],
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
.NextArrowAlign {
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);
}
.NextArrowSize {
  width: auto;
  height: min(5vh,9vw)
}
</style>
