    <template>
  <div class="cardGrid">
    <p class="userName2">
      {{ userName }}
      <img
        class="highlight"
        v-if="isPlayer1"
        src="@/assets/Images/highlight.png"
      />
    </p>
    <p class="scoreName">
      <animated-number :number="score" :baseNumber="oldScore" />
    </p>
    <img v-show="wentUp" src="@/assets/Images/scoreUp.svg" />
  </div>
</template>
<script>
import AnimatedNumber from "@/components/ux/AnimatedNumber.vue";
export default {
  components: {
    AnimatedNumber,
  },
  props: ["userName", "score", "oldScore", "wentUp", "isPlayer1"],
};
</script>
<style scoped>
.cardGrid {
  display: grid;
  grid-template-columns: 1fr 30%;
  grid-column-gap: 2%;
  position: relative;
  align-items: center;
  width: 100%;
  margin: 0;
  padding: 0;
}

p {
  text-align: left;
  font-family: "Roboto", serif;
  font-size: 0.8em;
  margin: 0;
  margin-bottom: 0;
}
.userName2 {
  text-align: left;
  font-weight: bold;
  margin: 0;
  margin-bottom: 0;
  font-size: 0.7em;
}
.scoreName {
  text-align: right;
  font-weight: bold;
  margin: 0;
  margin-bottom: 0;
}
.highlight {
  position: absolute;
  left: -20%;
  top: -20%;
  z-index: -1;
  height: 160%;
  width: 125%;
}
</style>