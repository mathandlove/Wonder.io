  <template>
  <div class="pageContainer" ref="notepadholder">
    <img
      alt=""
      :src="notepadImageLocation"
      ref="base"
      id="base"
      @load="updateBase"
      :style="adjustingBox"
    />
    <div class="writableArea" :style="notepadHolderStyle">
      <div class="notepadText" :style="nts">
        <slot> </slot>
      </div>
      <div
        v-if="this.NIV.showPrevious"
        class="squareMeLeft"
        :style="leftArrowSize"
      >
        <nav-prev-arrow-e></nav-prev-arrow-e>
      </div>
      <div
        v-if="this.NIV.showNext"
        class="squareMeRight"
        :style="rightArrowSize"
      >
        <nav-next-arrow-e></nav-next-arrow-e>
      </div>
    </div>
  </div>
</template>
<script>
import NavPrevArrowE from "@/atoms/NavPrevArrowE.vue";
import NavNextArrowE from "@/atoms/NavNextArrowE.vue";
import AuthorInfoMobile from "@/components/booklayout/AuthorInfoMobile.vue";

export default {
  components: {
    NavNextArrowE,
    NavPrevArrowE,
    AuthorInfoMobile,
  },
  inject: ["NIV"],
  data() {
    return {
      counter: 0,
      name: "Test",
      ih: 0,
      iw: 0,
      currentAspect: 0,
      baseFontSize: 0,
      lineHeightC: 2,
      styleObject: {
        fontSize: "2rem",
        height: "200px",
        width: "300px",
      },
      adjustingBox: {
        height: "auto",
        width: "100%",
      },
    };
  },
  computed: {
    notepadImageLocation() {
      if (this.NIV.hasLines)
        return require("@/assets/Images/notepadWithLines.png");
      else {
        return require("@/assets/Images/NotepadWithoutLines.png");
      }
    },
    leftArrowSize() {
      const size = 0.08 * this.ih + "px";
      const temp = {
        width: size,
        height: size,
      };

      if (this.currentAspect < 1.2) {
        temp.left = -0.1 * this.ih + "px";
      } else if (this.currentAspect < 1.6) {
        temp.left = -0.03 * this.ih + "px";
      } else {
        temp.left = "0px";
      }

      return temp;
    },
    rightArrowSize() {
      const size = 0.08 * this.ih + "px";
      const temp = {
        width: size,
        height: size,
      };

      if (this.currentAspect < 1.2) {
        temp.right = -0.1 * this.ih + "px";
      } else if (this.currentAspect < 1.6) {
        temp.right = -0.015 * this.ih + "px";
      } else {
        temp.right = 0.02 * this.ih + "px";
      }

      return temp;
    },
    nts() {
      this.baseFontSize = this.ih * 0.04;
      this.lineHeightC = this.ih * 0.04 * 1.45 + "px";
      const ntso = {
        fontSize: this.baseFontSize + "px",
        lineHeight: this.lineHeightC,
      };
      return ntso;
    },
    notepadHolderStyle() {
      this.styleObject.width = this.iw + 0 + "px";
      this.styleObject.height = this.ih + 0 + "px";
      this.styleObject.paddingTop = this.ih * 0.16 + "px";
      this.styleObject.paddingLeft = this.iw * 0.08 + "px";
      this.styleObject.paddingRight = this.iw * 0.1 + "px";
      this.styleObject.paddingBottom = this.ih * 0.03 + "px";

      return this.styleObject;
    },
  },
  methods: {
    submit() {
      this.counter++;
    },
    updateBase: function () {
      if (this.$refs.base != null) {
        this.iw = this.$refs.base.width;
        this.ih = this.$refs.base.height;
        this.switchAdjustBox();
      }
    },
    //Note that I made a decision to have 10% on left and right at all times
    updateStyles: function () {},
    switchAdjustBox: function () {
      if (this.$refs.notepadholder != undefined) {
        console.log(this.$refs.notepadholder);
        const aspectScreen =
          this.$refs.notepadholder.clientHeight /
          (this.$refs.notepadholder.clientWidth * 0.8);
        this.currentAspect = aspectScreen;
        const aspectImage = 2565 / 1495;
        this.$store.state.AspectRatio = aspectScreen;
        // this.name =
        //   this.$store.state.AspectRatio +
        //   " w: " +
        //   window.innerHeight / window.innerWidth;

        if (aspectScreen < aspectImage) {
          this.adjustingBox.height = "100%";
          this.adjustingBox.width = "auto";
        } else {
          this.adjustingBox.height = "auto";
          this.adjustingBox.width = "80%";
        }
      }
    },
  },
  mounted() {
    window.addEventListener("resize", this.updateBase);
    this.updateBase();
  },
  unmounted() {
    window.removeEventListener("resize", this.updateBase);
  },
};
</script>
<style >
.writableArea {
  position: absolute;
  top: 50%;
  left: 51%;
  transform: translate(-50%, -50%);
}

.makeBorder {
  border: none;
  border-color: blueviolet;
  border-width: 3px;
  box-sizing: border-box;
}

.makeBorder2 {
  border: none;
  border-color: coral;
  border-width: 3px;
  box-sizing: border-box;
}

.notepadText {
  text-align: left;
  overflow: clip;
  height: 100%;
  width: 100%;
  font-family: "CoopForged";
}

.h1c {
  text-align: center;
  font-size: 2em;
  padding-top: 1em;
  font-weight: 700;
  margin-bottom: 1em;
  margin-top: 0.5em;
}

input {
  margin-top: 1em;
  background-color: red;
}

.pillBoxLong {
  font-family: "Roboto", serif;

  height: 2.5em;
  font-size: 0.7em;
  padding: 1em;
  width: 15em;
  color: black;
  border-style: solid;
  border-color: black;
  border-radius: 0.8em;
  box-shadow: 3px 3px black;
  position: relative;
  background-color: white;
}

.authorInformation {
  background-color: red;
  position: absolute;
  right: 0;
}

.pillBoxLong:hover {
  background-color: rgba(233, 233, 233, 0.281);
}
*:focus {
  outline: none;
}

Button {
  font-family: "Roboto", serif;
  font-size: 0.8em;
  font-weight: bold;
  margin-top: 2em;
  background-color: #96c5c2;
  padding-left: 2em;
  padding-right: 2em;
  border-radius: 200px;
  border: none;
}
Button:hover {
  background-color: #7da8a5;
}

#testImage {
  height: 100%;
}

#base {
  position: absolute;
  top: 50%;
  left: 51%;
  transform: translate(-50%, -50%);
}
.pageContainer {
  text-align: center;
  height: 80%;
  position: relative;
  flex-grow: 1;
}

.squareMeLeft {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateX(-80%);
}

.squareMeRight {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateX(+80%);
}

.LargeBodyText {
  font-size: 1.6em;
  line-height: 1.3;
}
</style>