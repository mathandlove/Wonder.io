<template>
  <div class="authorPanel">
    <div class="d-flex align-items-end justify-content-start">
      <img id="glass" src="@/assets/Images/infoGlass.png" />
      <p class="h2a">About this Book</p>
    </div>
    <p class="h3a">The Case of the Mystery Egg</p>
    <p>
      Author: <b>Mur Laferty</b><br />
      Art: <b>Silvia Armelo</b><br />
      <b>255 Pages</b>
    </p>
  </div>
</template>

<script>
export default {
  inject: ["NIV"],
};
</script>

<style scoped>
.authorPanel {
  position: absolute;
  font-family: Roboto;
  left: 72%;

  bottom: 18%;
  width: 300px;
  padding-left: 30px;
  border-left: solid;
  border-width: 1px;
}
.h2a {
  font-family: "CoopForged";
  font-size: 1.3rem;
  margin-left: 0px;
}
.h3a {
  font-size: 1rem;
  font-weight: 700;
}
#glass {
  height: 40px;
  margin-bottom: 20px;
  margin-left: -10px;
}
</style>