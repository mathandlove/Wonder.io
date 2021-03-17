<template>
  <img class="iconSize ArrowAlign" alt="" src="../assets/Images/computerBack.png"
       @click="this.$emit('prev-page')"
       v-if="+this.$store.state.BookPage!==1"
       :style="{left: windowWidth/2-windowHeight*0.24+'px'}"/>
  <img class="iconSize ArrowAlign" alt="" src="../assets/Images/nextButton.png"
       v-if="this.$store.state.HighestPage > this.$store.state.BookPage"
       :style="{left: windowWidth/2+windowHeight*0.23+'px'}"
       @click="this.$emit('next-page')"/>
</template>

<script>
export default {
  emits: ['NextPage', 'next-page','PrevPage','prev-page'],
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
.iconSize {
  height: 5vh;
  margin-top: 1.5vh;
  width: auto;
}
.ArrowAlign {
  position: fixed;
  top: 48%;
  transform: translate(-50%, -50%);
}
</style>
