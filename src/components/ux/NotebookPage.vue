  <template>
  <div class="pageContainer makeBorder" ref="notepadholder">
    <img
      alt=""
      src="@/assets/Images/notepadWithLines.png"
      ref="base"
      id="base"
      @load="updateBase"
      :style="adjustingBox"
    />
    <div class="writableArea makeBorder2" :style="notepadHolderStyle">
      <div class="notepadText" :style="nts">{{ name }}</div>
      <div class="squareMeLeft" :style="leftArrowSize">
        <nav-prev-arrow-e></nav-prev-arrow-e>
      </div>
      <div class="squareMeRight" :style="rightArrowSize">
        <nav-next-arrow-e></nav-next-arrow-e>
      </div>
    </div>
  </div>
</template>
<script>
import NavPrevArrowE from "@/atoms/NavPrevArrowE.vue";
import NavNextArrowE from "@/atoms/NavNextArrowE.vue";

export default {
  components: {
    NavNextArrowE,
    NavPrevArrowE,
  },
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
      this.baseFontSize = this.ih * 0.046;
      const ntso = {
        fontSize: this.baseFontSize + "px",
        lineHeight: this.lineHeightC,
      };
      return ntso;
    },
    notepadHolderStyle() {
      this.styleObject.width = this.iw + 0 + "px";
      this.styleObject.height = this.ih + 0 + "px";
      this.styleObject.paddingTop = 7 + "vh";
      this.styleObject.paddingLeft = 3.5 + "vh";
      this.styleObject.paddingRight = 4 + "vh";
      this.styleObject.paddingBottom = 3.5 + "vh";

      return this.styleObject;
    },
  },
  methods: {
    submit() {
      this.counter++;
    },
    updateBase: function () {
      try {
        this.iw = this.$refs.base.width;
        this.ih = this.$refs.base.height;
        this.switchAdjustBox();
      } catch {
        console.log("found null val in ih iw");
      }
    },
    //Note that I made a decision to have 10% on left and right at all times
    updateStyles: function () {},
    switchAdjustBox: function () {
      const aspectScreen =
        this.$refs.notepadholder.clientHeight /
        (this.$refs.notepadholder.clientWidth * 0.8);
      this.currentAspect = aspectScreen;
      const aspectImage = 2565 / 1495;
      this.$store.state.AspectRatio = aspectScreen;
      this.name = this.$store.state.AspectRatio;
      if (aspectScreen < aspectImage) {
        this.adjustingBox.height = "100%";
        this.adjustingBox.width = "auto";
      } else {
        this.adjustingBox.height = "auto";
        this.adjustingBox.width = "80%";
      }
    },
  },
  mounted() {
    window.addEventListener("resize", this.updateBase);
    this.updateBase();
  },
  destroyed() {
    window.removeEventListener("resize", this.updateBase);
  },
};
</script>
<style scoped>
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
  height: 30px;
  width: 30px;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateX(-80%);
}

.squareMeRight {
  height: 30px;
  width: 30px;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateX(+80%);
}
</style>