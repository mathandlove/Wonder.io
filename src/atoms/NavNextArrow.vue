<template>
  <div @click="this.$emit('next-page')"
       :style="{width: this.$store.state.AspectRatio > 1 ? this.$store.state.AspectRatio > 1.5 ?
        '14vw' : '23vw' : windowWidth/2-windowHeight*0.25+'px'}"
       class="NextButtonSize">
    <img class="NextArrowSize NextArrowAlign" alt="" src="../assets/Images/nextButton.png"/>
  </div>
</template>

<script>
export default {
  emits: ['NextPage', 'next-page'],
  data() {
    const windowWidth = 1;
    const windowHeight = 1;
    return { windowWidth, windowHeight };
  },
  created() {
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  },
  unmounted() {
    window.removeEventListener('resize', this.handleResize);
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
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.NextArrowSize {
  width: auto;
  height: min(5vh,9vw)
}
.NextButtonSize {
  position: fixed;
  top: 15%;
  height: 70%;
  right: 0;
}
.NextButtonSize:hover {
  cursor: pointer;
}
</style>
