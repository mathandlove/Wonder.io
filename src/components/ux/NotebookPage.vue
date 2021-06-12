  <template>
  <div :key="page" class="pageContainer makeBorder" ref="notepadholder">
    <img
      alt=""
      src="@/assets/Images/notepadWithLines.png"
      ref="base"
      id="base"
      @load="updateBase"
      :style="adjustingBox"
    />
    <div class="writableArea makeBorder" :style="notepadHolderStyle">
      <div class="notepadText makeBorder" :style="nts">{{ name }}</div>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      counter: 0,
      name: "Test",
      ih: 0,
      iw: 0,
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
    updateStyles: function () {},
    switchAdjustBox: function () {
      const aspectScreen =
        this.$refs.notepadholder.clientHeight /
        this.$refs.notepadholder.clientWidth;
      const aspectImage = 2565 / 1495;
      this.name = aspectScreen;
      if (aspectScreen < aspectImage) {
        this.adjustingBox.height = "100%";
        this.adjustingBox.width = "auto";
      } else {
        this.adjustingBox.height = "auto";
        this.adjustingBox.width = "100%";
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
.pageContainer {
  position: relative;
  text-align: center;
  z-index: 0;
  height: 80vh;
}

.writableArea {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
}

.makeBorder {
  border: solid;
  border-color: coral;
  border-width: 3px;
  box-sizing: border-box;
}

.notepadText {
  text-align: left;
}
</style>