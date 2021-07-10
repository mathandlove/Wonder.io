<template>
  <div class="RestartModalStyle">
    <div class="restartQuestionStyle">Are you sure you want to RESTART?</div>
    <div class="yesnocontainer">
      <button class="ButtonStyle YesButtonColor" @click="this.YesSelected">
        <img
          class="yesImageHeight"
          :src="require(`../assets/Images/checkmark.png`)"
        />
        <div class="textSize">YES</div>
      </button>
      <button class="ButtonStyle NoButtonColor" @click="this.NoSelected">
        <img class="noImageHeight" :src="require(`../assets/Images/X.png`)" />
        <div class="textSize">NO</div>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    NoSelected() {
      this.$store.dispatch("toggleModal", false);
    },
    YesSelected() {
      this.$store.dispatch("resetBook");
    },
  },
};
</script>

<style scoped>
.RestartModalStyle {
  position: absolute;
  background-color: #000000;
  opacity: 0.9;
  z-index: 1;
  height: 97%;
  width: 100%;
  top: 50%;
  left: 49%;
  font-family: "CoopForged";
  font-size: 1.8em;
  line-height: 1.3em;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.restartQuestionStyle {
  color: white;
  text-align: center;
  padding: 1em;
  padding-top: 2em;
}
.yesnocontainer {
  display: flex;
  flex-direction: row;
}
.ButtonStyle {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-width: 0;
  padding: 1em;
  outline: none;
}
.YesButtonColor {
  color: #04d41c;
  background-color: #000000;
}
.NoButtonColor {
  color: #fc7474;
  background-color: #000000;
}
.NoButtonColor:hover,
.YesButtonColor:hover {
  cursor: pointer;
  color: white;
}

.noImageHeight {
  height: 1.3em;
}
.yesImageHeight {
  height: 1.3em;
}
</style>
