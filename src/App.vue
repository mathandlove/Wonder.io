<template>
  <router-view />
</template>
<script>
export default {
  created() {
    this.$store.dispatch(
      "setAspectRatio",
      window.innerHeight / window.innerWidth
    );
  },
};
</script>

<style>
@font-face {
  font-family: "Roboto";
  src: local("Roboto"), url("assets/fonts/RobotoRegular.ttf") format("truetype");
}
@font-face {
  font-family: "CoopForged";
  src: local("CoopForged"),
    url("assets/fonts/CoopForged Regular.otf") format("opentype");
}
#app {
  font-family: "CoopForged", Helvetica, Arial, sans-serif;
}
</style>
