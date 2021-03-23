<template>
  <div :style="{height: this.$store.state.AspectRatio > 2 ? '17.5vh' : '10vh',
                'padding-top': this.$store.state.AspectRatio > 2 ? '6vh' : '2vh'}"
        class="row text-center">
    <div class="d-none d-xl-block col-xl-3"/>
    <div class="col-6 col-xl-3">
      <img alt="" src="../assets/Images/WonderStories_Logo_BlackAlt.png" class="NavWonderLogo"/>
    </div>
    <div class="col-2 col-xl-1">
      <router-link to="/books">
        <img class="navIconSize" alt="" src="../assets/Images/home.png"/>
      </router-link>
    </div>
    <div class="col-2 col-xl-1">
      <img class="navIconSize hoverHand" alt="" src="../assets/Images/restart.png"
           @click="this.$emit('show-modal')"/>
    </div>
    <div class="col-2 col-xl-1">
      <img class="navIconSize hoverHand" alt="" src="../assets/Images/blackAudioOnWhiteBackground.png"
           @click="audioClick('hello')"/>
    </div>
    <div class="d-none d-xl-block col-xl-3"/>
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
.hoverHand:hover {
  cursor: pointer;
}
.NavWonderLogo {
  height: min(5vh,9vw);
}
.navIconSize {
  height: min(4.5vh,9vw);
  width: auto;
}
</style>
