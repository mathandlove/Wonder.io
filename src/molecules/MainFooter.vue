<template>
  <div class="footerHeight row text-center">
    <div class="col-4">
      <img class="iconSize" alt="" src="../assets/Images/computerBack.png"
           v-if="this.PageNum()!=1" @click="RoutePrevPage"/>
    </div>
    <div class="col-4"></div>
    <div v-if="this.$store.state.HighestPage > this.PageNum()" class="col-4">
      <img class="iconSize" alt="" src="../assets/Images/nextButton.png"
           @click="RouteNextPage(false)"/>
    </div>
    <div v-else class="col-4"></div>
  </div>
  <img class="iconHand" alt="" src="../assets/Images/TearHand.png"
       v-if="this.PageNum()<this.totalPages && this.showHand"
       @click="RouteNextPage(true)"/>
</template>

<script>
export default {
  props: {
    showHand: {
      type: Boolean,
      required: true,
    },
    totalPages: {
      type: Number,
      required: true,
    },
    skipArray: {
      type: Array,
      required: true,
    },
  },
  methods: {
    PageNum() {
      return this.$store.state.BookPage;
    },
    RouteNextPage(newHighestPage) {
      let tempPage = +this.PageNum() + 1;
      this.skipArray.forEach((choice) => {
        if (tempPage > choice.StartPage && tempPage < choice.EndPage) {
          if (choice.SelectedPage && tempPage <= choice.SelectedPage) {
            tempPage = choice.SelectedPage;
          } else { tempPage = choice.EndPage; }
        }
      });
      if (newHighestPage && tempPage > this.$store.state.HighestPage) {
        this.$store.dispatch('setHighestPage', tempPage);
      }
      this.$store.dispatch('setBookPage', tempPage);
      this.$router.push(`/book/${this.$store.state.BookID}/${tempPage}`);
    },
    RoutePrevPage() {
      let tempPage = this.PageNum() - 1;
      this.skipArray.forEach((choice) => {
        if (tempPage > choice.StartPage && tempPage < choice.EndPage) {
          if (choice.SelectedPage && tempPage >= choice.SelectedPage) {
            tempPage = choice.SelectedPage;
          } else { tempPage = choice.StartPage; }
        }
      });
      this.$store.dispatch('setBookPage', tempPage);
      this.$router.push(`/book/${this.$store.state.BookID}/${tempPage}`);
    },
  },
};
</script>

<style scoped>
.iconSize {
  height: 5vh;
  margin-top: 1.5vh;
  width: auto;
}
.iconHand {
  position: absolute;
  top: 92.5%;
  left: 50%;
  transform: translate(-50%, -50%);
  height: 7vh;
  width: auto;
}
.footerHeight {
  height: 8vh;
}
</style>
