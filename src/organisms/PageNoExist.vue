<template>
  <img alt="" class="h-100" src="../assets/Images/notepadWithLines.png"/>
  <div class="centeredNoExist">
    <div class="fontSizeExist"><u><i>Page Doesn't Exist</i></u></div>
    <button class="btn btn-info buttonHeight" @click="ReturnToStart">
      Return to Beginning
    </button>
  </div>
</template>

<script>
export default {
  emits: ['ShowHand', 'show-hand'],
  created() {
    this.$emit('show-hand', false);
  },
  methods: {
    ReturnToStart() {
      this.$store.dispatch('setBookPage', 1);
      this.$router.push(`/book/${this.$store.state.BookID}/1`);
    },
  },
};
</script>

<style scoped>
.centeredNoExist {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.fontSizeExist {
  font-size: 5vh;
  margin-bottom: 3.5vh;
}
.buttonHeight {
  width: 15vh;
  padding-top: 1vh;
  font-size: 1.5vh;
}
</style>
