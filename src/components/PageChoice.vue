<template>
  <img alt="" class="h-100" src="../assets/Images/notepadWithLines.png"/>
  <div class="centeredChoiceText">
    <h1 class="bottomPaddingChoice fontSizeChoice"><u><i>Enter Choice Page</i></u></h1>
    <ol>
      <li class="buttonFormat">
        <button class="button buttonWidth bg-danger">Wrong</button>
      </li>
      <li class="buttonFormat">
        <button class="button buttonWidth bg-success">Correct</button>
      </li>
      <li class="buttonFormat">
        <button class="button buttonWidth bg-danger">Wrong</button>
      </li>
      <li class="buttonFormat">
        <button class="button buttonWidth bg-danger">Wrong</button>
      </li>
    </ol>
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
.fontSizeChoice {
  font-size: 4vh;
}
.bottomPaddingChoice {
  padding-bottom: 2.6vh;
}
.buttonFormat {
  font-size: 2vh;
  padding-top: 1vh;
  min-height: 4vh;
}
.buttonWidth {
  min-width: 10vh;
}
</style>
