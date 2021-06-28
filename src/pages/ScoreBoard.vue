<template>
  <div class="ScoreboardBackGround text-center">
    <div class="container">
      <div class="ScoreBoardTitle">Scoreboard</div>
      <div v-for="(player,index) in this.$store.state.Scores.slice().sort(this.NewScoreDescend)"
           :key="player.id">
        <div class="row ScoreBoardTextStyle"
             :class="[player.id === 0 ?'bg-warning':'']"
             :style="{top: 35+index*10-this.timerCounter/10*this.FindOffset(index,player.id)+'%'}">
          <div class="col-2 m-0 p-0">{{index+1}}</div>
          <div class="col-6 m-0 p-0 text-left">{{player.name}}</div>
          <ScoreCounter class="col-2 m-0 p-0 text-right"
                        :points-start="player.OldScore" :points-end="player.NewScore"/>
          <div class="col-2 m-0 p-0">
            <div v-if="this.FindOffset(index,player.id) > 0" class="arrowSize arrowDown"/>
            <div v-else-if="this.FindOffset(index,player.id) < 0" class="arrowSize arrowUp"/>
            <div v-else class="EqualSignSize text-left">=</div>
          </div>
          <div class="GreyLine ScoreBoardWidth"></div>
        </div>
      </div>
      <button class="btn btn-info buttonPosition" @click="HandleNextPage">Next Page</button>
    </div>
  </div>
</template>

<script>
import ScoreCounter from '../atoms/ScoreCounter.vue';

export default {
  components: { ScoreCounter },
  props: {
    wrongAnswers: {
      type: String,
      required: false,
    },
  },
  data() {
    let PlayerScoreAdj;
    let Bot1ScoreAdj;
    let Bot2ScoreAdj;
    let Bot3ScoreAdj;
    let timerUnsubscribe;
    const timerCounter = 100;
    return {
      PlayerScoreAdj, Bot1ScoreAdj, Bot2ScoreAdj, Bot3ScoreAdj, timerCounter, timerUnsubscribe,
    };
  },
  methods: {
    HandleNextPage() {
      this.$router.push(`/book/${this.$store.state.BookId}/${this.$store.state.BookPage}`);
    },
    NewScoreDescend(a, b) {
      const number1 = a.NewScore;
      const number2 = b.NewScore;
      let comparison = 0;
      if (number1 < number2) { comparison = 1; } else if (number1 > number2) { comparison = -1; }
      return comparison;
    },
    OldScoreDescend(a, b) {
      const number1 = a.OldScore;
      const number2 = b.OldScore;
      let comparison = 0;
      if (number1 < number2) { comparison = 1; } else if (number1 > number2) { comparison = -1; }
      return comparison;
    },
    randomNum(a, b) {
      const minNum = Math.ceil(a);
      const maxNum = Math.floor(b);
      return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum);
    },
    scoreBoundary(newScore) {
      if (newScore > 1000) { return 1000; }
      if (newScore < 0) { return 0; }
      return newScore;
    },
    FindOffset(newPosition, playerID) {
      const tempArray = this.$store.state.Scores.slice().sort(this.OldScoreDescend);
      let oldPosition;
      tempArray.forEach((item, index) => { if (item.id === playerID) { oldPosition = index; } });
      return newPosition - oldPosition;
    },
  },
  created() {
    if (+this.wrongAnswers === 0) {
      this.PlayerScoreAdj = 1000;
    } else if (+this.wrongAnswers === 1) {
      this.PlayerScoreAdj = 500;
    } else if (+this.wrongAnswers >= 2) {
      this.PlayerScoreAdj = 0;
    }
    if (typeof this.PlayerScoreAdj === 'number') {
      this.Bot1ScoreAdj = this.scoreBoundary(this.PlayerScoreAdj + this.randomNum(-700, 700));
      this.Bot2ScoreAdj = this.scoreBoundary(this.PlayerScoreAdj + this.randomNum(-700, 700));
      this.Bot3ScoreAdj = this.scoreBoundary(this.PlayerScoreAdj - this.randomNum(0, 1000));
      this.$store.dispatch('setUserScoreAdd', { id: 0, add: this.PlayerScoreAdj });
      this.$store.dispatch('setUserScoreAdd', { id: 1, add: this.Bot1ScoreAdj });
      this.$store.dispatch('setUserScoreAdd', { id: 2, add: this.Bot2ScoreAdj });
      this.$store.dispatch('setUserScoreAdd', { id: 3, add: this.Bot3ScoreAdj });
    }
    this.timerUnsubscribe = setInterval(() => {
      if (this.timerCounter <= 0) {
        clearInterval(this.timerUnsubscribe);
      } else {
        this.timerCounter -= 1;
      }
    }, 15);
  },
};
</script>

<style scoped>
.ScoreboardBackGround {
  background-color: #96c5c2;
  height: 100vh;
  width: 100vw;
}
.ScoreBoardTitle {
  padding-top: 20vh;
  font-size: min(5vh,8vw);
}
.ScoreBoardTextStyle {
  position: fixed;
  left: 50%;
  width: 50%;
  transform: translate(-50%,-50%);
  height: min(7vh,10vw);
  padding-top: 1vh;
  font-size: min(3vh, 4vw);
  font-weight: 700;
  font-family: 'Roboto', serif;
}
.GreyLine {
  margin-top: 3vh;
  width: 100%;
  border-color: lightgrey;
  border-style: none none solid none;
}
.arrowSize {
  margin-left: min(1.5vh,2vw);
  margin-top: min(1.5vh,2vw);
  width: 0;
  height: 0;
  border-left: min(1vh,1.5vw) solid transparent;
  border-right: min(1vh,1.5vw) solid transparent;
}
.arrowUp {
  border-bottom: 1vh solid green;
}
.arrowDown {
  border-top: 1vh solid red;
}
.EqualSignSize {
  margin-top: 0.25vw;
  margin-left: min(1.8vh,3vw);
  font-size: min(2vh,4vw);
}
.buttonPosition {
  margin-top: 55vh;
}
</style>
