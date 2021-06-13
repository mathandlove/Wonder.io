<template>
  <img alt="" class="h-100" src="../assets/Images/notepadWithLines.png"/>
  <h1 class="centeredENDText fontSizeEND"><u><i>THE END</i></u></h1>
</template>

<script>
export default {
  emits: ['ShowHand', 'show-hand'],
  created() {
    this.$emit('show-hand', true);
  },
};
</script>

<style scoped>
.centeredENDText {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.fontSizeEND {
  font-size: min(6vh,10vw);
}
</style>
