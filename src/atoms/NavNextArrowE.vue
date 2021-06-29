<template>
  <img
    v-show="showNextButton"
    class="NextArrowSize"
    alt=""
    src="../assets/Images/nextButton.png"
    rel="preload"
  />
  <div v-if="showNextButton" @click="NIV.gotoNext" class="NextButtonSize"></div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  inject: ["NIV"],
  computed: {
    ...mapGetters(["showNextButton"]),
  },
  data() {
    return { windowWidth: 1, windowHeight: 1 };
  },
  inject: ["NIV"],
  created() {
    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  },
  unmounted() {
    window.removeEventListener("resize", this.handleResize);
  },
  methods: {
    handleResize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
    },
  },
};
</script>

<style scoped>
.NextArrowSize {
  width: auto;
  height: 100%;
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
.NextButtonSize {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  transform: translate(-15%, -25%);
  height: 200%;
  width: 200%;
  /* border: solid;
  border-color: salmon; */
}
.NextButtonSize:hover {
  cursor: pointer;
}
</style>
