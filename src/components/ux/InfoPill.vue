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
    :style="{ background: backgroundColorCalc }"
  >
    <div
      v-if="showProgressBar"
      class="insideProgressFill"
      :style="{ width: pagePercent }"
    ></div>
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
    numberOfPages: {
      type: Number,
      default: 1,
    },
    showProgressBar: {
      type: Boolean,
      default: false,
    },
    rank: {
      type: Number,
      default: 3,
    },
  },
  data() {
    return {};
  },
  computed: {
    pagePercent() {
      let truePercent = (this.value / this.numberOfPages) * 100;
      const calculatedPercent = 30 + truePercent * 0.7;
      return calculatedPercent + "%";
    },
    backgroundColorCalc() {
      if (this.rank >= 3) {
        return "white";
      } else if (this.rank == 2) {
        return "#B6B6B6";
      } else if (this.rank == 1) {
        return "rgb(228,199,77)";
      }
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
  position: relative;
}
.starSize {
  height: 15px;
  margin: 7px;
  z-index: 1;
}

.buttonTitle {
  font-weight: 700;
  margin-bottom: 1px;
  font-family: "Roboto", serif;
}

.scoreStyle {
  flex-grow: 1;
  z-index: 1;
}

.insideProgressFill {
  background-color: #8f9ad8;
  height: 100%;
  position: absolute;
  line-height: inherit;
  width: 80%;
  border-radius: 200px;
  z-index: 0;
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
