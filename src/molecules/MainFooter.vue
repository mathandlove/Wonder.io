<template>
  <div class="footerHeight row text-center">
    <div class="col-4 col-lg-3 col-xl-2">
      <div class="fontRoboto textSize">POINTS</div>
      <div class="progressBarStyle fontRoboto bg-white">
        <div class="row d-flex">
          <img class="col-3 starSize pr-1" alt="" src="../assets/Images/Star.svg"/>
          <div class="col-6">
            {{ points }}
          </div>
          <img class="col-3 starSize pl-1" alt="" src="../assets/Images/Star.svg"/>
        </div>
      </div>
    </div>
    <div class="col-4 col-lg-6 col-xl-8"></div>
    <div class="col-4 col-lg-3 col-xl-2">
      <div class="fontRoboto textSize">PAGE</div>
      <div class="progressBarStyle fontRoboto" :style="{background:
               // eslint-disable-next-line max-len
               `linear-gradient(to right, #8f9ad8 0%, #8f9ad8 ${this.PagePercent}%, #FFFFFF ${this.PagePercent}%, #FFFFFF 100%)`}">
        {{this.PageNum()}}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    totalPages: {
      type: Number,
      required: true,
    },
    points: {
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
.footerHeight {
  height: 10vh;
}
.fontRoboto {
  font-family: "Roboto",serif;
}
.textSize {
  font-size: 2vh;
}
.progressBarStyle {
  height: 4vh;
  font-size: 2vh;
  padding-top: 0.2vh;
  width: auto;
  color: black;
  border-style: solid;
  border-color: black;
  border-radius: 15px;
  box-shadow: 3px 3px black;
}
.starSize {
  height: 2vh;
  margin-top: 0.5vh;
}
</style>
