<template>
  <div class="RestartModalStyle">
    <div class="restartQuestionStyle">Are you sure you want to RESTART?</div>
    <button class="ButtonStyle YesButtonColor" @click="this.YesSelected" >
      <img class="yesImageHeight" :src="require(`../assets/Images/checkmark.png`)"/>
      <div class="textSize">YES</div>
    </button>
    <button class="ButtonStyle NoButtonColor" @click="this.NoSelected">
      <img class="noImageHeight" :src="require(`../assets/Images/X.png`)"/>
      <div class="textSize">NO</div>
    </button>
  </div>
</template>

<script>
export default {
  methods: {
    NoSelected() {
      this.$emit('close-modal');
    },
    YesSelected() {
      this.$store.dispatch('setHighestPage', 1);
      this.$store.dispatch('setBookPage', 1);
      this.$store.dispatch('ClearScores');
      this.$router.push('/join');
      this.$emit('close-modal');
    },
  },
};
</script>

<style scoped>
.RestartModalStyle {
  position: absolute;
  background-color: #000000;
  opacity: 0.9;
  height: min(81vh,145vw);
  width: min(50vh,90vw);
  margin-top: 2vh;
  z-index: 1;
  left: 50%;
  transform: translate(-50%);
}
.restartQuestionStyle {
  color: white;
  text-align: center;
  font-size: min(5vh,9vw);
  padding-top: min(15vh,27vw);
  padding-left: min(10vh,18vw);
  padding-bottom: min(5vh,9vw);
  width: min(38vh,68vw);
}
.ButtonStyle {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  width: min(15vh,27vw);
  margin-left: min(7vh,12.5vw);
  border-width: 0;
}
.YesButtonColor {
  color: #04d41c;
  background-color: #000000;
}
.NoButtonColor {
  color: #fc7474;
  background-color: #000000;
}
.NoButtonColor:hover,.YesButtonColor:hover {
  cursor: pointer;
  text-decoration: underline;
}
.textSize {
  font-size: min(8vh,14.4vw);
}
.noImageHeight {
  height: min(8vh,14.4vw);
}
.yesImageHeight {
  height: min(10vh,18vw);
}
</style>
