<template>
  <div v-if="NIV.showAuthorMobile" class="authorPanel">
    <br />
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

<style>
.authorPanel {
  font-family: Roboto;

  width: 300px;
  padding-left: 30px;
  border-left: solid;
  border-width: 1px;
  border-color: red;
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