<template>
  <div class="headerBlock row text-center">
    <div class="col-6 h-100 align-items-center d-flex pr-2">
      <img
        alt=""
        src="../assets/Images/WonderStories_Logo_BlackAlt.png"
        class="NavWonderLogo"
        :style="{
          width: $store.state.AspectRatio > 1.1 ? '100%' : '300px',
        }"
      />
    </div>
    <div
      class="
        col-6
        h-100
        align-items-center
        d-flex
        justify-content-end
        pl-5
        py-3
      "
    >
      <img
        class="navIconSize hoverHand"
        src="../assets/Images/blackAudioOnWhiteBackground.png"
        @click="audioClick('hello')"
        alt=""
        v-if="false"
      />
      <router-link to="/books" class="navIconSize">
        <img
          class="iconInsideLink"
          alt=""
          href="home"
          src="../assets/Images/home.png"
        />
      </router-link>

      <img
        class="navIconSize hoverHand"
        alt=""
        src="../assets/Images/restart.png"
        @click="this.$emit('show-modal')"
      />
    </div>
  </div>
</template>

<script>
export default {
  emits: ["ShowModal", "show-modal"],
  computed: {
    hope() {
      return this.$store.state.AspectRatio;
    },
  },
  methods: {
    async audioClick(word) {
      console.log("TextToSpeech word is =", word);
    },
  },
};
</script>

<style scoped>
.hoverHand:hover {
  cursor: pointer;
}
.NavWonderLogo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  margin-left: 5px;
}

.headerBlock {
  height: 10%;
  /* padding-top: 6%;
  padding-bottom: 6%; */
  margin: 0;
  padding: 0;
  padding-top: 10px;
  padding-bottom: 10px;
}

.iconInsideLink {
  height: 40px;
  width: 40px;
}

.navIconSize {
  height: 40px;
  width: 40px;
  margin-left: 15px;

  display: flex;
}

@media (min-width: 800px) {
  .navIconSize {
    margin-right: 30px;
    height: 50px;
    width: 50px;
  }
  .iconInsideLink {
    height: 50px;
    width: 50px;
  }
}
</style>
