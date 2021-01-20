<template>
  <div class="RestartModalStyle darkBackground">
    <div class="restartQuestionStyle">Are you sure you want to RESTART?</div>
    <router-link :to="{name: 'Book', params: {id: this.bookNumber, page: 1}}"
                 @click="this.closeThisModal" class="ButtonStyle YesButtonColor">
      <img class="yesImageHeight" :src="require(`../assets/Images/checkmark.png`)"/>
      <div class="textSize">YES</div>
    </router-link>
    <button class="ButtonStyle NoButtonColor darkBackground" @click="this.closeThisModal">
      <img class="noImageHeight" :src="require(`../assets/Images/X.png`)"/>
      <div class="textSize">NO</div>
    </button>
  </div>
</template>

<script>
export default {
  props: {
    bookNumber: {
      type: String,
      required: true,
    },
  },
  methods: {
    closeThisModal() {
      this.$emit('close-modal');
    },
  },
};
</script>

<style scoped>
.RestartModalStyle {
  position: absolute;
  height: 81vh;
  width: 50vh;
  margin-top: 2vh;
  z-index: 1;
  left: 50%;
  transform: translate(-50%);
}
.darkBackground {
  background-color: #000000;
  opacity: 90%;
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
}
.NoButtonColor {
  color: #fc7474;
}
.NoButtonColor:hover {
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
