<template>
  <img alt="" class="h-100" src="../assets/Images/notepadWithLines.png"/>
  <div class="centeredChoiceText">
    <div class="pb-4 ChoiceTitleSize">Choice:</div>
    <div class="ChoiceTextSize">Enter Choice Page Here</div>
  </div>
</template>

<script>
export default {
  props: {
    data: {
      type: Array,
      required: true,
    },
  },
  created() {
    console.log('Choice page =', this.data);
  },
};
</script>

<style scoped>
.centeredChoiceText {
  position: absolute;
  top: 28%;
  left: 50%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 38vh;
}
.ChoiceTitleSize {
  font-size: 4vh;
}
.ChoiceTextSize {
  font-size: 3vh;
  max-width: 45vh;
}
</style>
