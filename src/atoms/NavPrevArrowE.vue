<template>
  <img
    class="PrevArrowSize PrevArrowAlign"
    alt=""
    src="../assets/Images/computerBack.png"
    v-if="showPrevButton"
  />
  <div v-if="showPrevButton" @click="NIV.gotoPrev" class="PrevButtonSize"></div>
</template>

<script>
import { mapGetters } from "vuex";
export default {
  computed: {
    ...mapGetters(["showPrevButton", "nextPage"]),
  },
  data() {
    const windowWidth = 1;
    const windowHeight = 1;
    return { windowWidth, windowHeight };
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
.PrevArrowSize {
  width: auto;
  height: 100%;
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
.PrevButtonSize {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  transform: translate(-35%, -25%);
  height: 200%;
  width: 200%;
}
.PrevButtonSize:hover {
  cursor: pointer;
}
</style>
