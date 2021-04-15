<template>
  <div class="CelebrationBackground">
    <img class="confetti" :style="{left: 0}" alt="" src="../assets/Images/Stage_confetti.svg"/>
    <img class="confetti" :style="{right: 0}" alt="" src="../assets/Images/Stage_confetti.svg"/>
    <div v-if="MakeBronzeDrop">
      <div v-if="this.SortedPlayers[0].name" class="PlayerName ShiftBronze">
        {{this.SortedPlayers[2].name}}
      </div>
      <img  class="MedalStyle MedalDrop ShiftBronze" src="../assets/Images/MedalBronze.svg" alt=""/>
      <div v-if="this.SortedPlayers[0].score" class="PlayerScore ShiftBronze">
        {{CommaFormat(this.SortedPlayers[2].score)}}
      </div>
    </div>
    <div v-if="MakeSilverDrop">
      <div v-if="this.SortedPlayers[0].name" class="PlayerName ShiftSilver">
        {{this.SortedPlayers[1].name}}
      </div>
      <img class="MedalStyle MedalDrop ShiftSilver" src="../assets/Images/MedalSilver.svg" alt=""/>
      <div v-if="this.SortedPlayers[0].score" class="PlayerScore ShiftSilver">
        {{CommaFormat(this.SortedPlayers[1].score)}}
      </div>
    </div>
    <div v-if="MakeGoldDrop">
      <div v-if="this.SortedPlayers[0].name" class="PlayerName ShiftGold">
        {{this.SortedPlayers[0].name}}
      </div>
      <img class="MedalStyle MedalDrop ShiftGold" src="../assets/Images/MedalGold.svg" alt=""/>
      <div v-if="this.SortedPlayers[0].score" class="PlayerScore ShiftGold">
        {{CommaFormat(this.SortedPlayers[0].score)}}
      </div>
    </div>
    <button class="btn bg-success NextStyle border border-dark"
            @click="HandleClick">Transition Page</button>
  </div>
</template>

<script>
export default {
  data() {
    const MakeBronzeDrop = false;
    let SortedPlayers;
    const MakeSilverDrop = false;
    const MakeGoldDrop = false;
    const soundApplause = new Audio(require('../assets/sounds/audienceClap.wav'));
    return {
      MakeBronzeDrop, MakeSilverDrop, MakeGoldDrop, SortedPlayers, soundApplause,
    };
  },
  methods: {
    HandleClick() {
      this.$router.push('/transition');
    },
    CommaFormat(number) {
      const formatType = new Intl.NumberFormat('en-US');
      return formatType.format(number);
    },
    numberDescend(a, b) {
      const number1 = a.score;
      const number2 = b.score;
      let comparison = 0;
      if (number1 < number2) { comparison = 1; } else if (number1 > number2) { comparison = -1; }
      return comparison;
    },
  },
  created() {
    this.SortedPlayers = this.$store.state.Scores.slice().sort(this.numberDescend);
    this.soundApplause.play();
    setTimeout(() => { this.MakeBronzeDrop = true; }, 500);
    setTimeout(() => { this.MakeSilverDrop = true; }, 1000);
    setTimeout(() => { this.MakeGoldDrop = true; }, 1500);
  },
  unmounted() {
    this.soundApplause.pause();
  },
};
</script>

<style scoped>
.CelebrationBackground {
  background-image: url('../assets/Images/Stage_3steps.svg');
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  height: 100vh;
}
.MedalStyle {
  height: min(20vh,20vw);
  width: auto;
}
.MedalDrop {
  position: absolute;
  top: 50%;
  transform: translate(-50%,-50%);
  animation: MedalDropAnimation;
  animation-timing-function: ease-out;
  animation-duration: 2s;
}
.ShiftBronze {
  left: 70vw;
}
.ShiftSilver {
  left: 30vw;
}
.ShiftGold {
  left: 50vw;
}
@keyframes MedalDropAnimation {
  0% {top: 0}
  100% {top: 50%}
}
.PlayerName {
  font-size: min(3vh,4vw);
  position: absolute;
  top: 35%;
  opacity: 1;
  transform: translate(-50%,-50%);
  animation: OpacityChange;
  animation-duration: 2s;
}
.PlayerScore {
  font-size: min(3vh,4vw);
  font-weight: 900;
  position: absolute;
  top: 63%;
  opacity: 1;
  transform: translate(-50%,-50%);
  animation: OpacityChange;
  animation-duration: 2s;
}
.confetti {
  height: 30%;
  width: auto;
  overflow: hidden;
  position: absolute;
  top: 0;
  opacity: 1;
  animation: OpacityChange;
  animation-duration: 3.5s;
}
@keyframes OpacityChange {
  0% {opacity: 0}
  99% {opacity: 0}
  100% {opacity: 1}
}
.NextStyle {
  position: absolute;
  left: 80vw;
  top: 80vh;
  transform: translate(-50%,-50%);
}
</style>
