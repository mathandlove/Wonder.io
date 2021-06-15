<template>
  <div v-if="NIV.showAuthorFull" class="authorPanel">
    <div
      v-if="NIV.showAuthorFull"
      class="d-flex align-items-end justify-content-start"
    >
      <img id="glass" src="@/assets/Images/infoGlass.png" />
      <p class="h2a">About this Book</p>
    </div>
    <p class="h3a">{{ NIV.bookTitle }}</p>
    <p class="h4a">
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
.h2a {
  display: none;
}

.authorPanel {
  font-family: Roboto;
  line-height: 1.5;
  text-align: left;
  padding-left: 0em;
  padding-top: 0em;
  border-left: solid;
  border-width: 1px;
  padding-left: 1em;
  margin-top: 3em;
  margin-left: 1em;
}

.h3a {
  font-size: 0.7em;
  font-weight: 700;
}
.h4a {
  font-size: 0.6em;
}
#glass {
  display: none;
}

@media (min-aspect-ratio: 10/8) {
  @media (min-width: 900px) {
    .authorPanel {
      position: absolute;
      font-family: Roboto;
      left: 105%;

      bottom: 18%;
      width: 300px;
      padding-left: 30px;
      border-left: solid;
      border-width: 1px;
      line-height: 1.5;
    }
    .h2a {
      font-family: "CoopForged";
      font-size: 1.3rem;
      margin-left: 0px;
      display: block;
    }
    #glass {
      height: 40px;
      margin-bottom: 20px;
      margin-left: -10px;
      display: block;
    }
    .h3a {
      font-size: 1rem;
      font-weight: 700;
    }
    .h4a {
      font-size: 1rem;
    }
  }
}
</style>