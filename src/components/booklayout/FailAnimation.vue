 <template>
  <div class="container">
    <img
      class="dinoImageBackground dinoImage"
      :class="{ backgroundImageAnimation: animationStep == 'D3' }"
      src="@/assets/Images/D0.png"
      rel="preload"
    />
    <transition name="textreveal">
      <div class="correctSign" v-if="animationStep == 'D3'">
        {{ correctText }}
      </div>
    </transition>
    <transition
      name="reveal1"
      appear
      v-on:after-enter="afterEnter"
      v-on:enter="enter"
    >
      <img
        v-show="animationStep == 'D1'"
        class="dinoImage"
        src="@/assets/Images/D1.png"
        rel="preload"
      />
    </transition>
    <transition name="reveal2" v-on:after-enter="afterEnter" v-on:enter="enter">
      <img
        v-show="animationStep == 'D2'"
        class="dinoImage"
        src="@/assets/Images/D2.png"
        rel="preload"
      />
    </transition>
    <transition
      name="reveal3"
      v-on:enter="enter"
      v-on:after-enter="animationDone"
    >
      <img
        v-show="animationStep == 'D3'"
        class="dinoImage"
        :src="correctDinoImage"
        rel="preload"
      />
    </transition>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
import { mapActions } from "vuex";
export default {
  props: ["readyToAnimate"],
  data() {
    return {
      animationStep: "",
    };
  },
  watch: {
    pageMicroType: function () {
      if (
        this.readyToAnimate &&
        (this.pageMicroType == "failanimation" ||
          this.pageMicroType == "passanimation")
      ) {
        this.animationStep = "D1";
      }
    },
  },
  mounted() {
    // this.$store.dispatch("setPageStyle", "question");
  },
  dismounted() {},
  computed: {
    ...mapGetters(["pageMicroType"]),
    correctText() {
      if (this.pageMicroType == "failanimation") {
        return "Wrong!";
      } else {
        return "Correct!";
      }
    },
    correctDinoImage() {
      if (this.pageMicroType == "failanimation") {
        return require("@/assets/Images/W3.png");
      } else {
        return require("@/assets/Images/D3.png");
      }
    },
  },
  methods: {
    afterEnter() {
      if (this.animationStep == "D1") {
        this.animationStep = "D2";
      } else if (this.animationStep == "D2") {
        this.animationStep = "D3";
      }
    },
    ...mapActions(["setPageStyle"]),
    answerClicked(index) {
      this.$store.dispatch("setAnswerClicked", index);
    },
    animationDone() {
      this.$store.dispatch("dinoAnimationDone");
    },
  },
};
</script>

<style scoped>
.container {
  position: absolute;
  top: 18%;
  left: 0;
  right: 0;
  height: 60%;

  transform: translate(0, 0%);
}
.correctSign {
  position: absolute;
  top: 25%;
  left: 0%;
  right: 0;
  width: 100%;
  text-align: center;
  font-weight: 700;
  font-size: 2em;
  opacity: 0;
}
.dinoImage {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  object-fit: contain;
  opacity: 0;
}
.dinoImageBackground {
  opacity: 1;
}

.reveal1-enter-active {
  animation: reveal1 1.7s;
  /* 1.7s */
}

.reveal2-enter-active {
  animation: reveal2 1.26s;
  /* 1.26s */
}

.reveal3-enter-active {
  animation: reveal3 2.8s;
}

.textreveal-enter-active {
  animation: textreveal 2.8s;
}

.backgroundImageAnimation {
  animation: reveal4 2.8s;
  animation-fill-mode: forwards;
}
@keyframes reveal1 {
  0% {
    opacity: 0;
  }
  60% {
    opacity: 0;
  }
  74% {
    opacity: 1;
  }
  82% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes reveal2 {
  0% {
    opacity: 0;
  }
  18% {
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
  57% {
    opacity: 1;
  }
  71% {
    opacity: 0;
  }
}

@keyframes reveal3 {
  0% {
    opacity: 0;
  }
  7% {
    opacity: 1;
  }
  87% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
@keyframes reveal4 {
  0% {
    opacity: 1;
  }

  87% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes textreveal {
  0% {
    opacity: 0;
  }
  56% {
    opacity: 0;
  }
  63% {
    opacity: 1;
  }
  87% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>