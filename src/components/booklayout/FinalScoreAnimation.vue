
  <template>
  <meta name="viewport" content="width=device-width, user-scalable=no" />
  <meta
    name="viewport"
    content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1"
  />

  <body
    class="BookBackGroundStyle noSelectText makeBorder d-flex flex-column"
    :style="dynamicBodyHeight"
  >
    <img
      src="@/assets/Images/nextButton.png"
      class="continueButton"
      @click="$store.dispatch('showFinalScoreDone')"
    />
    <img
      v-if="false"
      src="@/assets/Images/centerLight.png"
      class="centerLight"
    />

    <img src="@/assets/Images/projectedLight.png" class="leftLight" />
    <img src="@/assets/Images/projectedLight.png" class="rightLight" />
    <img src="@/assets/Images/centerLight.png" class="centerLight" />
    <img src="@/assets/Images/platform.png" class="platform" />
    <div class="bronzeHolder">
      <img src="@/assets/Images/MedalBronze.svg" class="medal" />
      <p class="medalText">{{ allScoreCards[2].name }}</p>
      <p class="medalText scoreText">{{ allScoreCards[2].NewScore }}</p>
    </div>
    <div class="silverHolder">
      <img src="@/assets/Images/MedalSilver.svg" class="medal" />
      <p class="medalText">{{ allScoreCards[1].name }}</p>
      <p class="medalText scoreText">{{ allScoreCards[1].NewScore }}</p>
    </div>
    <div class="goldHolder">
      <img src="@/assets/Images/MedalGold.svg" class="medal" />
      <p class="medalText">{{ allScoreCards[0].name }}</p>
      <p class="medalText scoreText">{{ allScoreCards[0].NewScore }}</p>
    </div>
  </body>
</template>
<script>
import { mapGetters } from "vuex";

export default {
  data() {
    return {
      dynamicBodyHeight: {
        height: "30px",
      },
    };
  },
  computed: {
    ...mapGetters(["allScoreCards"]),
  },
  methods: {
    makeClientViewSize() {
      this.dynamicBodyHeight = window.screen.Height + "px";
    },
  },
  mounted() {
    window.addEventListener("resize", this.makeClientViewSize);
    this.makeClientViewSize();
  },
};
</script>

<style scoped>
img {
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
}

.BookBackGroundStyle {
  height: 100%;
  width: 100vw;
  background-color: #3d9a96;
  position: fixed;
  padding: 0;
  margin: 0;
}
.medal {
  height: 100%;
}
.medalText {
  text-align: center;
  font-family: "CoopForged";
  font-weight: bold;
  font-size: 3em;
  text-transform: uppercase;
  margin: 0;
  padding: 0;
}
.scoreText {
  font-family: "Roboto";
  margin-top: -2%;
  font-size: 1.8em;
}
.continueButton {
  position: absolute;
  right: 13%;
  bottom: 20%;
  width: max(8%, 80px);
  z-index: 3;
  animation: continueAnimation 50s forwards;
  transform: translateX(50%);
}
.continueButton:hover {
  width: max(9%, 90px);
}
.leftLight {
  position: absolute;
  left: -15%;
  width: 50%;
  height: 100%;
  padding-bottom: 7%;
  animation: leftLightAnimation 50s forwards;
}
.bronzeHolder {
  position: absolute;
  left: 10%;
  bottom: 15%;
  height: 30%;
  width: auto;
  transform: translateX(-50%);
  animation: bronzeMedalAnimation 50s forwards;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.silverHolder {
  position: absolute;
  right: 10%;
  bottom: 15%;
  height: 30%;
  width: auto;
  transform: translateX(50%);
  animation: silverMedalAnimation 50s forwards;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.goldHolder {
  position: absolute;
  right: 50%;
  bottom: 15%;
  height: 30%;
  width: auto;
  transform: translateX(50%);
  animation: goldMedalAnimation 50s forwards;
}

.rightLight {
  position: absolute;
  right: -15%;
  width: 50%;
  height: 100%;
  padding-bottom: 7%;
  transform: scaleX(-1);
  animation: rightLightAnimation 50s forwards;
}

.centerLight {
  position: absolute;
  left: 50%;
  width: 70%;
  height: 100%;
  padding-bottom: 3%;

  transform: translateX(-50%);
  animation: centerLightAnimation 50s forwards;
}

.platform {
  position: absolute;
  left: 0%;
  bottom: 0%;
  width: 50%;
  height: 30%;
  padding-bottom: 5%;
  transform: translate(50%);
}

@keyframes leftLightAnimation {
  0% {
    left: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
    opacity: 0;
  }

  2% {
    left: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
    opacity: 0;
  }
  3% {
    left: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
    opacity: 1;
  }
  4% {
    left: 20%;
    width: 70%;
    height: 100%;
    padding-bottom: 3%;
  }
  17% {
    left: 20%;
    width: 70%;
    height: 100%;
    padding-bottom: 3%;
  }
  19% {
    left: 70%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
  }
  100% {
    left: 70%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
  }
}

@keyframes rightLightAnimation {
  0% {
    right: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
    opacity: 0;
  }
  8% {
    right: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
    opacity: 0;
  }

  10% {
    right: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
    opacity: 1;
  }
  11% {
    right: 20%;
    width: 70%;
    height: 100%;
    padding-bottom: 3%;
  }
  17% {
    right: 20%;
    width: 70%;
    height: 100%;
    padding-bottom: 3%;
  }
  19% {
    right: 70%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
  }

  100% {
    right: 70%;
    width: 50%;
    height: 100%;
    padding-bottom: 2%;
  }
}
@keyframes bronzeMedalAnimation {
  0% {
    left: 10%;
    bottom: 10%;
    opacity: 0;
    height: 30%;
  }
  2% {
    left: 10%;
    bottom: 15%;
    opacity: 1;
  }
  3% {
    left: 10%;
    bottom: 15%;
    opacity: 1;
  }
  4% {
    left: 50%;
    bottom: 50%;
    height: 30%;
  }
  7% {
    left: 50%;
    bottom: 50%;
    height: 30%;
    color: rgba(0, 0, 0, 1);
  }

  8% {
    left: 35%;
    height: 20%;
    color: rgba(0, 0, 0, 0);
    bottom: 54%;
  }

  100% {
    left: 35%;
    height: 20%;
    color: rgba(0, 0, 0, 0);
    bottom: 54%;
  }
}

@keyframes silverMedalAnimation {
  0% {
    right: 10%;
    bottom: 15%;
    opacity: 0;
    height: 30%;
  }
  7% {
    right: 10%;
    bottom: 15%;
    opacity: 0;
    height: 30%;
  }
  9% {
    right: 10%;
    bottom: 15%;
    opacity: 1;
  }
  10% {
    right: 10%;
    bottom: 15%;
    opacity: 1;
  }
  11% {
    right: 50%;
    bottom: 50%;
    height: 30%;
  }
  15% {
    right: 50%;
    bottom: 50%;
    height: 30%;
    color: rgba(0, 0, 0, 1);
  }
  16% {
    right: 35%;
    height: 20%;
    color: rgba(0, 0, 0, 0);
    bottom: 54%;
  }

  100% {
    right: 35%;
    height: 20%;
    color: rgba(0, 0, 0, 0);
    bottom: 54%;
  }
}

@keyframes goldMedalAnimation {
  0% {
    right: 50%;
    height: 40%;

    bottom: 40%;
    opacity: 0;
  }
  19% {
    right: 50%;
    height: 40%;

    bottom: 40%;
    opacity: 0;
  }
  20% {
    right: 50%;
    height: 40%;

    bottom: 50%;
    opacity: 1;
  }

  100% {
    right: 50%;
    height: 40%;

    bottom: 50%;
  }
}
@keyframes centerLightAnimation {
  0% {
    opacity: 0;
  }
  18.5% {
    opacity: 0;
  }
  19% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.8;
  }
}

@keyframes continueAnimation {
  0% {
    opacity: 0;
    disabled: true;
  }
  19% {
    opacity: 0;
  }
  20% {
    opacity: 1;
    disabled: false;
  }

  100% {
    opacity: 1;
  }
}

@media (max-aspect-ratio: 1024/1369) {
  .platform {
    height: 25%;
    padding-bottom: 8%;
  }
}
@media (max-aspect-ratio: 500/960) {
  .platform {
    height: 15%;
    padding-bottom: 10%;
  }
}
</style>