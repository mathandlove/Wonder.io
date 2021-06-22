
<template>
  <div class="authorPanel">
    <div class="d-flex align-items-end justify-content-start">
      <img id="glass" src="@/assets/Images/infoGlass.png" />
      <p class="h2a">About this Book</p>
    </div>
    <p class="h3a">{{ bookTitle }}</p>
    <p class="h4a">
      Author: <b>{{ getAuthor }}</b
      ><br />
      Art: <b>{{ getIllustrator }}</b
      ><br />
      <b>{{ totalNumberOfPages + " Pages" }}</b>
    </p>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  computed: {
    ...mapGetters([
      "illustrator",
      "bookTitle",
      "totalNumberOfPages",
      "getAuthor",
      "getIllustrator",
    ]),
  },
};
</script>

<style scoped>
</style>