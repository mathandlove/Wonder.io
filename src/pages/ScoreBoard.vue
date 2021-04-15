<template>
  <div class="ScoreboardBackGround">
    <div class="ScoreboardTopPadding container text-center">
      <div class="ScoreBoardTitle">Scoreboard</div>
      <div v-for="(player,index) in this.$store.state.Scores.slice().sort(this.numberDescend)"
           :key="player.id">
        <div class="row d-inline-flex ScoreTextStyle ScoreBoardWidth"
             :class="[player.id === 0 ?'bg-warning':'']">
          <div class="col-2 m-0 p-0">{{index+1}}</div>
          <div class="col-5 m-0 p-0 text-left">{{player.name}}</div>
          <div class="col-3 m-0 p-0 text-right">{{player.score}}</div>
          <div class="col-2 m-0 p-0 DeltaIconSize">&Delta;</div>
        </div>
        <div class="GreyLine ScoreBoardWidth"></div>
      </div>
      <button class="btn btn-info my-3" @click="HandleNextPage">Next Page</button>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    HandleNextPage() {
      this.$router.push(`/book/${this.$store.state.BookID}/${this.$store.state.BookPage}`);
    },
    numberDescend(a, b) {
      const number1 = a.score;
      const number2 = b.score;
      let comparison = 0;
      if (number1 < number2) { comparison = 1; } else if (number1 > number2) { comparison = -1; }
      return comparison;
    },
  },
};
</script>

<style scoped>
.ScoreboardBackGround {
  background-color: #96c5c2;
  height: 100vh;
  width: 100vw;
}
.ScoreboardTopPadding {
  padding-top: 20vh;
}
.ScoreBoardTitle {
  font-size: min(5vh,8vw);
  padding-bottom: 5vh;
}
.ScoreTextStyle {
  font-size: min(3vh, 4vw);
  padding-top: min(1vh, 1.5vw);
  padding-bottom: min(1vh, 1.5vw);
  font-weight: 700;
  font-family: 'Roboto', serif;
  margin-top: min(0.5vh, 1vw);
  margin-bottom: min(0.5vh, 1vw);
}
.ScoreBoardWidth {
  width: 50%;
}
.DeltaIconSize {
  font-size: 2vh;
}
.GreyLine {
  margin: auto;
  border-color: lightgrey;
  border-style: none none solid none;
}
</style>
