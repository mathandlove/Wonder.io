<template>
  <div
    class="
      scoreContainer
      text-center
      d-flex
      flex-column
      align-items-center
      justify-content-center
    "
  >
    <div class="buttonTitle">Page</div>
    <div
      class="
        ScoreBarStyle
        text-center
        d-flex
        justify-content-between
        align-items-center
      "
      :style="{
        'background-color': 'white',
      }"
    >
      <img class="starSize" alt="" src="../assets/Images/Star.svg" />
      <div class="scoreStyle">
        {{ points }}
      </div>
      <img class="starSize" alt="" src="../assets/Images/Star.svg" />
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
  font-family: "Roboto", serif;
  height: 40px;
  font-size: 20px;
  width: 150px;
  color: black;
  border-style: solid;
  border-color: black;
  border-radius: 200px;
  box-shadow: 3px 3px black;
}
.starSize {
  height: 15px;
  margin: 7px;
}

.buttonTitle {
  font-weight: 700;
  margin-bottom: 1px;
  font-family: "Roboto", serif;
}
.scoreContainer {
  margin-bottom: 10px;
  padding: 0;
}
.scoreStyle {
  flex-grow: 1;
}

@media (max-width: 400px) and (max-aspect-ratio: 110/100) {
  .ScoreBarStyle {
    height: 30px;
    width: 100px;
    font-size: 16px;
  }
  .starSize {
    height: 12px;
  }
  .buttonTitle {
    margin-bottom: 0px;
    font-size: 11px;
  }
}

@media (max-height: 800px) and (max-aspect-ratio: 110/100) {
  .ScoreBarStyle {
    height: 30px;
    width: 100px;
    font-size: 16px;
  }
  .starSize {
    height: 12px;
  }
  .buttonTitle {
    margin-bottom: 0px;
    font-size: 11px;
  }
}

@media (min-aspect-ratio: 110/100) {
  .scoreContainer {
    position: absolute;
    left: 15%;
    top: -120%;
  }
}
</style>
