<template>
  <div @click="this.$emit('prev-page')" v-if="+this.$store.state.BookPage!==1"
       :style="{width: this.$store.state.AspectRatio > 1 ? this.$store.state.AspectRatio > 1.5 ?
        '14vw' : '23vw' : windowWidth/2-windowHeight*0.25+'px'}"
       class="PrevButtonSize">
    <img class="PrevArrowSize PrevArrowAlign" alt="" src="../assets/Images/computerBack.png"/>
  </div>
</template>

<script>
export default {
  emits: ['PrevPage', 'prev-page'],
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
.PrevArrowAlign {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.PrevArrowSize {
  width: auto;
  height: min(5vh,9vw)
}
.PrevButtonSize {
  position: fixed;
  top: 15%;
  left: 0;
  height: 70%;
}
.PrevButtonSize:hover {
  cursor: pointer;
}
</style>
