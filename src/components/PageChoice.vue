<template>
  <template v-if="this.AnswerValue==true">
    <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"
         @click="this.AnswerValue=null"/>
    <div class="animation centeredImage"/>
    <img alt="" class="centeredImage fadeOpacity" src="../assets/Images/D3.png"/>
    <div class="centeredAnswerText fadeOpacity" @click="this.AnswerValue=null">
      <h1 class="fontSizeAnswer">Correct!</h1>
    </div>
  </template>
  <template v-else-if="this.AnswerValue==false">
    <img alt="" class="h-100" src="../assets/Images/NotepadWithoutLines.png"
         @click="this.AnswerValue=null"/>
    <div class="animation centeredImage"/>
    <img alt="" class="centeredImage fadeOpacity" src="../assets/Images/W3.png"/>
    <div class="centeredAnswerText fadeOpacity" @click="this.AnswerValue=null">
      <h1 class="fontSizeAnswer">Wrong!</h1>
    </div>
  </template>
  <template v-else>
    <img alt="" class="h-100" src="../assets/Images/notepadWithLines.png"/>
    <div class="centeredChoiceText">
      <div class="bottomPaddingChoice fontSizeChoice text-left">Question X:</div>
      <ol>
        <li v-for:="(choice,index) in AnswerArray" class="buttonFormat">
          <button class="button buttonWidth"
                  :style="{backgroundColor:
                    choice.clickedOn ? choice.value ? 'aquamarine' : 'pink' : 'grey'}"
                  :disabled="choice.clickedOn"
                  @click="choiceClick(index)">
            {{ choice.name }}
          </button>
        </li>
      </ol>
    </div>
  </template>
</template>

<script>
export default {
  props: {
    data: {
      type: Array,
      required: true,
    },
  },
  data() {
    const AnswerArray = [
      { name: 'Choice1', value: false, clickedOn: false },
      { name: 'Choice2', value: false, clickedOn: false },
      { name: 'Choice3', value: true, clickedOn: false },
      { name: 'Choice4', value: false, clickedOn: false },
    ];
    let AnswerValue;
    return { AnswerArray, AnswerValue };
  },
  methods: {
    choiceClick(index) {
      this.AnswerArray[index].clickedOn = true;
      this.AnswerValue = this.AnswerArray[index].value;
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
.centeredAnswerText {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.centeredImage {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 30vh;
  height: 45vh;
  transform: translate(-50%, -50%);
}
.fontSizeAnswer {
  font-size: 8vh;
}
.animation {
  background-size: cover;
  animation: changeBg;
  animation-duration: 2s;
}
.fadeOpacity {
  opacity: 1;
  animation: changeOpacity;
  animation-duration: 2s;
}

@keyframes changeBg {
  0% {background-image: url("../assets/Images/D0.png");}
  33% {background-image: url("../assets/Images/D1.png");}
  66% {background-image: url("../assets/Images/D2.png");}
}
@keyframes changeOpacity {
  0% {opacity: 0}
  80% {opacity: 0}
  100% {opacity: 1}
}

</style>
