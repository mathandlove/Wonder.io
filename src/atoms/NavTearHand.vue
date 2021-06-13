<template>
  <img class="iconHand" alt="" src="../assets/Images/TearHand.png"
       :style="{bottom: this.$store.state.AspectRatio > 2 ? '9.5%' : '2%'}"
       @click="TearHandClick"/>
</template>

<script>
export default {
  emits: ['NextPage', 'next-page'],
  data() {
    const soundTearPage = new Audio(require('../assets/sounds/tearSound.wav'));
    return { soundTearPage };
  },
  methods: {
    TearHandClick() {
      window.navigator.vibrate(100);
      this.soundTearPage.play();
      this.$emit('next-page')
    }
  }
};
</script>

<style scoped>
.iconHand {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  height: 7vh;
  width: auto;
}
</style>
