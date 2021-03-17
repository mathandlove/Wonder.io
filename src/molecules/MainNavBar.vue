<template>
  <div class="navBarHeight row text-center">
    <div class="col-6">
      <img class="iconSize" alt="" src="../assets/Images/WonderStories_Logo_BlackAlt.png"/>
    </div>
    <div class="d-none d-lg-block col-lg-3"/>
    <div class="col-2 col-lg-1">
      <router-link to="/books">
        <img class="iconSize" alt="" src="../assets/Images/home.png"/>
      </router-link>
    </div>
    <div class="col-2 col-lg-1">
      <img class="iconSize hoverHand" alt="" src="../assets/Images/restart.png"
           @click="this.$emit('show-modal')"/>
    </div>
    <div class="col-2 col-lg-1">
      <img class="iconSize hoverHand" alt="" src="../assets/Images/blackAudioOnWhiteBackground.png"
           @click="audioClick('hello')"/>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['ShowModal', 'show-modal'],
  methods: {
    async audioClick(word) {
      console.log('TextToSpeech word is =', word);
    },
  },
};
</script>

<style scoped>
.navBarHeight {
  height: 10vh;
}
.hoverHand:hover {
  cursor: pointer;
}
</style>
