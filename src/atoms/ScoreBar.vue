<template>
  <div class="ScoreBarStyle text-center"
       :style="{'background-color': points > 5000 ? points > 10000 ? 'gold' : 'silver' : 'white'}">
    <div class="row d-flex">
      <img class="col-3 starSize pr-1" alt="" src="../assets/Images/Star.svg"/>
      <div class="col-6">
        {{ points }}
      </div>
      <img class="col-3 starSize pl-1" alt="" src="../assets/Images/Star.svg"/>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    points: {
      type: Number,
      required: true,
    },
  },
};
</script>

<style scoped>
.ScoreBarStyle {
  font-family: "Roboto",serif;
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
