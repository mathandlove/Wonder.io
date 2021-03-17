<template>
  <img class="iconHand" alt="" src="../assets/Images/TearHand.png"
       @click="this.$emit('next-page')"/>
</template>

<script>
export default {
  emits: ['NextPage', 'next-page'],
};
</script>

<style scoped>
.iconHand {
  position: absolute;
  top: 91%;
  left: 50%;
  transform: translate(-50%, -50%);
  height: 7vh;
  width: auto;
}
</style>
