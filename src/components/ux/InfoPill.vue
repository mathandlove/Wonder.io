<template>
  <div class="buttonTitle">{{ title }}</div>
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
    <img
      v-if="hasStars"
      class="starSize"
      alt=""
      src="@/assets/Images/Star.svg"
    />
    <div class="scoreStyle">
      {{ value }}
    </div>
    <img
      v-if="hasStars"
      class="starSize"
      alt=""
      src="@/assets/Images/Star.svg"
    />
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: Number,
      default: 0,
    },
    title: {
      type: String,
    },
    hasStars: {
      type: Boolean,
      default: true,
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

.scoreStyle {
  flex-grow: 1;
}

@media (max-width: 400px) and (max-aspect-ratio: 110/100) {
  .ScoreBarStyle {
    height: 30px;
    width: 85px;
    font-size: 13px;
  }
  .starSize {
    height: 8px;
  }
  .buttonTitle {
    margin-bottom: 2px;
    font-size: 11px;
  }
}

@media (max-height: 850px) and (max-aspect-ratio: 110/100) {
  .ScoreBarStyle {
    height: 30px;
    width: 85px;
    font-size: 13px;
  }
  .starSize {
    height: 8px;
  }
  .buttonTitle {
    margin-bottom: 2px;
    font-size: 11px;
  }
}
</style>
