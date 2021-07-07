
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
      v-if="false"
      src="@/assets/Images/centerLight.png"
      class="centerLight"
    />
    <img src="@/assets/Images/projectedLight.png" class="leftLight" />
    <img src="@/assets/Images/projectedLight.png" class="rightLight" />
    <img src="@/assets/Images/centerLight.png" class="centerLight" />
    <img src="@/assets/Images/platform.png" class="platform" />

    <img src="@/assets/Images/MedalBronze.svg" class="bronzeHolder" />
    <img src="@/assets/Images/MedalSilver.svg" class="silverHolder" />
    <img src="@/assets/Images/MedalGold.svg" class="goldHolder" />
  </body>
</template>
<script>
export default {
  data() {
    return {
      m: "leftMedalAppear",
      dynamicBodyHeight: {
        height: "30px",
      },
    };
  },
  methods: {
    makeClientViewSize() {
      this.dynamicBodyHeight = window.screen.Height + "px";
    },
    afterMedalAppears(el) {
      console.log("animationdone");
      this.m = "moveLeftMedal";
    },
    afterMoveLeftLight(el) {
      el.style.left = "20%";
      el.style.width = " 70%";
      el.style.height = "100%";
      el.style.paddingBottom = "3%";
    },
  },
  mounted() {
    window.addEventListener("resize", this.makeClientViewSize);
    this.makeClientViewSize();
  },
};
</script>

<style scoped>
.BookBackGroundStyle {
  height: 100%;
  width: 100vw;
  background-color: #3d9a96;
  position: fixed;
  padding: 0;
  margin: 0;
}

.leftLight {
  position: absolute;
  left: -15%;
  width: 50%;
  height: 100%;
  padding-bottom: 7%;
  animation: leftLightAnimation 10s forwards;
}
.bronzeHolder {
  position: absolute;
  left: 10%;
  bottom: 15%;
  height: 30%;
  width: auto;
  transform: translateX(-50%);
  animation: bronzeMedalAnimation 10s forwards;
}

.silverHolder {
  position: absolute;
  right: 0%;
  bottom: 15%;
  height: 30%;
  width: auto;
  transform: translateX(50%);
  animation: silverMedalAnimation 10s forwards;
}

.goldHolder {
  position: absolute;
  right: 50%;
  bottom: 15%;
  height: 30%;
  width: auto;
  transform: translateX(50%);
  animation: goldMedalAnimation 10s forwards;
}

.rightLight {
  position: absolute;
  right: -15%;
  width: 50%;
  height: 100%;
  padding-bottom: 7%;
  transform: scaleX(-1);
  animation: rightLightAnimation 10s forwards;
}

.centerLight {
  position: absolute;
  left: 50%;
  width: 70%;
  height: 100%;
  padding-bottom: 3%;

  transform: translateX(-50%);
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

@keyframes bronzeMedalAnimation {
  0% {
    left: 10%;
    bottom: 15%;
    opacity: 0%;
    height: 30%;
  }
  2% {
    left: 10%;
    bottom: 15%;
    opacity: 100%;
  }
  3% {
    left: 10%;
    bottom: 15%;
    opacity: 100%;
  }
  4% {
    left: 45%;
    bottom: 40%;
    height: 30%;
  }
  7% {
    left: 45%;
    bottom: 40%;
    height: 30%;
  }
  8% {
    left: 35%;
    height: 20%;

    bottom: 40%;
  }
  100% {
    left: 35%;
    height: 20%;

    bottom: 40%;
  }
}

@keyframes leftLightAnimation {
  0% {
    left: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 7%;
    opacity: 0%;
  }

  2% {
    left: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 7%;
    opacity: 0%;
  }
  3% {
    left: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 7%;
    opacity: 100%;
  }
  4% {
    left: 20%;
    width: 70%;
    height: 100%;
    padding-bottom: 3%;
  }
  100% {
    left: 20%;
    width: 70%;
    height: 100%;
    padding-bottom: 3%;
  }
}

@keyframes rightLightAnimation {
  0% {
    right: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 7%;
    opacity: 0%;
  }

  9% {
    right: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 7%;
    opacity: 0%;
  }
  10% {
    right: -15%;
    width: 50%;
    height: 100%;
    padding-bottom: 7%;
    opacity: 100%;
  }
  11% {
    right: 20%;
    width: 70%;
    height: 100%;
    padding-bottom: 3%;
  }
  100% {
    right: 20%;
    width: 70%;
    height: 100%;
    padding-bottom: 3%;
  }
}

@keyframes silverMedalAnimation {
  0% {
    right: 10%;
    bottom: 15%;
    opacity: 0%;
    height: 30%;
  }
  7% {
    right: 10%;
    bottom: 15%;
    opacity: 0%;
    height: 30%;
  }
  9% {
    right: 10%;
    bottom: 15%;
    opacity: 100%;
  }
  10% {
    right: 10%;
    bottom: 15%;
    opacity: 100%;
  }
  11% {
    right: 50%;
    bottom: 40%;
    height: 30%;
  }
  15% {
    right: 50%;
    bottom: 40%;
    height: 30%;
  }
  16% {
    right: 35%;
    height: 20%;

    bottom: 40%;
  }

  100% {
    right: 35%;
    height: 20%;

    bottom: 40%;
  }
}

@keyframes goldMedalAnimation {
  0% {
    right: 50%;
    height: 40%;

    bottom: 40%;
  }

  100% {
    right: 50%;
    height: 40%;

    bottom: 40%;
  }
}
</style>s