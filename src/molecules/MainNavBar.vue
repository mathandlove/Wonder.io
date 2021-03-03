<template>
  <div class="navBarColor navBarHeight row text-center">
    <div class="col-4">
      <img class="iconSize hoverHand" alt="" src="../assets/Images/restart.png"
           @click="this.$emit('show-modal')"/>
    </div>
    <div class="col-4">
      <div class="progressBarStyle" :style="{background:
               // eslint-disable-next-line max-len
               `linear-gradient(to right, #8f9ad8 0%, #8f9ad8 ${this.PagePercent}%, #3aaaa3 ${this.PagePercent}%, #3aaaa3 100%)`}">
        Page {{this.PageNum()}}
      </div>
    </div>
    <div class="col-4">
      <router-link to="/books">
        <img class="iconSize" alt="" src="../assets/Images/home.png"/>
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['ShowModal', 'show-modal'],
  props: {
    totalPages: {
      type: Number,
      required: true,
    },
  },
  methods: {
    PageNum() {
      return this.$store.state.BookPage;
    },
  },
  computed: {
    PagePercent() {
      return (this.$store.state.BookPage / this.totalPages) * 100;
    },
  },
};
</script>

<style scoped>
.navBarColor {
  background-color: #3aaaa3;
}
.navBarHeight {
  height: 8vh;
}
.progressBarStyle {
  height: 4vh;
  font-size: 2vh;
  font-family: "Roboto";
  padding-top: 0.2vh;
  width: auto;
  margin-top: 2vh;
  color: white;
  border-style: solid;
  border-color: white;
  border-radius: 15px;
}
.hoverHand:hover {
  cursor: pointer;
}
</style>
