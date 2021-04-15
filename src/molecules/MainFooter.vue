<template>
  <div class="footerHeight row text-center"
       :style="{'padding-top': this.$store.state.AspectRatio > 2 ? '4vh' : '0'}">
    <div class="d-none d-lg-block col-lg-3"/>
    <div class="col-4 col-lg-2">
      <div class="fontRoboto textSize">POINTS</div>
      <ScoreBar :points="this.$store.state.Scores[0].score"/>
    </div>
    <div class="col-4 col-lg-2"></div>
    <div class="col-4 col-lg-2">
      <div class="fontRoboto textSize">PAGE</div>
      <div class="progressBarStyle fontRoboto" :style="{background:
               // eslint-disable-next-line max-len
               `linear-gradient(to right, #8f9ad8 0%, #8f9ad8 ${this.PagePercent}%, #FFFFFF ${this.PagePercent}%, #FFFFFF 100%)`}">
        {{this.PageNum()}}
      </div>
    </div>
    <div class="d-none d-lg-block col-lg-3"/>
  </div>
</template>

<script>
import ScoreBar from '@/atoms/ScoreBar.vue';

export default {
  components: { ScoreBar },
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
</style>
