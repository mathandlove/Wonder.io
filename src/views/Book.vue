<template>
  <div class="backgroundPadding">
    <div class="container border border-dark BackGroundColor vh-100">
      <div class="navBarColor py-2 row text-center">
        <div class="col-4">
          <img class="iconSize" alt="" src="../assets/Images/restart.png"/>
        </div>
        <h3 class="col-4 pt-2 d-none d-md-block"><strong>Wonder Stories</strong></h3>
        <h6 class="col-4 pt-2 d-md-none"><strong>Wonder Stories</strong></h6>
        <div class="col-4">
          <router-link to="/books">
            <img class="iconSize" alt="" src="../assets/Images/home.png"/>
          </router-link>
        </div>
      </div>
      <div class="text-center BookHeight p-4">
        <img alt="" class="h-100" :src="require(`../assets/Books/book${id}/images/cover.png`)"/>
      </div>
      <div class="py-2 row text-center">
        <div class="col-4"/>
        <div class="col-4">
          <img class="iconSize" alt="" src="../assets/Images/blackAudioOn.png"/>
        </div>
        <div class="col-4">
          <img class="iconSize" alt="" src="../assets/Images/nextButton.png"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    id: {
      type: String,
      required: true,
    },
  },
};
</script>

<style scoped>
.backgroundPadding {
  min-height: 100vh;
  min-width: 100vw;
  background-color: grey;
}
.BookHeight {
  width: auto;
  height: 75%;
}
.iconSize {
  height: 3rem;
  width: auto;
}
.navBarColor {
  background-color: #3aaaa3;
}
.BackGroundColor {
  background-color: #96c5c2;
}
</style>
