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
      this.$router.push(`/book/${this.$store.state.BookID}/1`);
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
  height: 81vh;
  width: 50vh;
  margin-top: 2vh;
  z-index: 1;
  left: 50%;
  transform: translate(-50%);
}
.restartQuestionStyle {
  color: white;
  text-align: center;
  font-size: 5vh;
  padding-top: 15vh;
  padding-left: 10vh;
  padding-bottom: 5vh;
  width: 38vh;
}
.ButtonStyle {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  width: 15vh;
  margin-left: 7vh;
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
  font-size: 8vh;
}
.noImageHeight {
  height: 8vh;
}
.yesImageHeight {
  height: 10vh;
}
</style>
