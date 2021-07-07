 <template v>
  <div
    v-for="(linePart, index) in textSeries(pageNum)"
    :key="linePart"
    class="textContainer"
  >
    <div
      v-if="linePart.lineType == 'character' && linePart.orientation == 'l'"
      class="leftChar"
      :style="{
        minHeight: 1.45 * 3 - 0.1 + 'em',
      }"
    >
      <img :src="linePart.characterImageUrl" alt="" class="leftCharImage" />
      <div
        class="leftCharText"
        :style="{ width: 80 - (linePart.charPadding * 80) / 100 + 20 + '%' }"
        :class="{ robotoLeft: linePart.fontStyle == 'Moboto SDF' }"
      >
        {{ linePart.text + "\n\n" }}
      </div>
    </div>

    <div
      v-if="linePart.lineType == 'character' && linePart.orientation == 'r'"
      class="rightChar"
      :style="{
        minHeight: 1.45 * 3 - 0.1 + 'em',
      }"
    >
      <div
        class="rightCharText"
        :style="{ width: 80 - (linePart.charPadding * 80) / 100 + 20 + '%' }"
        :class="{ robotoRight: linePart.fontStyle == 'Moboto SDF' }"
        :ref="'rtext' + index"
        :id="'rtext' + index"
      >
        <!-- {{ linePart.text + "\n\n" }} -->
        {{ linePart.text + "\n\n" }}
      </div>
      <img
        :src="linePart.characterImageUrl"
        alt=""
        class="rightCharImage"
        @load="adjustTextLine('rchar' + index, 'rtext' + index)"
        :ref="'rchar' + index"
        :id="'rchar' + index"
      />
    </div>

    <div
      v-if="linePart.lineType == 'read'"
      class="mainText"
      :class="{ roboto: linePart.fontStyle == 'Moboto SDF' }"
    >
      {{ linePart.text }}
    </div>
    <div v-if="linePart.lineType == 'image'">
      <img
        class="mainImage"
        :src="linePart.imageUrl"
        :style="{ height: 1.45 * linePart.imageHeight - 0.1 + 'em' }"
      />
      <!-- lineHieght*imgHeight-descenderHeight -->
    </div>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
import { mapState } from "vuex";
export default {
  components: {},
  props: ["pageNum"],
  data() {
    return {};
  },

  dismounted() {},
  computed: {
    ...mapGetters(["textSeries"]),
    ...mapState(["lineHeightPixels"]),
    debugText() {
      console.log(this.$refs.rchar1);
      if (this.$refs.rchar1 != undefined)
        return this.$refs.rchar1.scrollHeight / this.lineHeightPixels;
      else {
        return "waiting";
      }
    },
  },
  mounted() {},
  methods: {
    adjustTextLine(refChar, refText) {
      // console.log(this.$refs[refText].scrollHeight / this.lineHeightPixels);
      // if (this.$refs[refText].scrollHeight / this.lineHeightPixels < 2.1)
      //   this.$refs[refChar].style.marginTop =
      //     -0.5 * this.lineHeightPixels + "px";
      //Went down a rabbit hole to make the character adjust depending on the amount of text. Ended upbeing better at half all the time.
    },
  },
};
</script>

<style scoped>
.mainText {
  white-space: pre-line;
  margin-bottom: 0em;
  width: 100%;
}
.mainImage {
  padding-bottom: 0.5em;
  padding-top: 0.3em;
  width: 100%;
  object-fit: contain;
}
.textContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.leftCharImage {
  height: 2.8em;
  position: absolute;
  left: -0.6em;
  margin-top: -0.5em;
}

.leftChar {
  position: relative;
  width: 100%;
}
.leftCharText {
  padding-left: 2.4em;
  white-space: pre-line;
}

.rightCharImage {
  height: 2.8em;
  position: absolute;
  right: -0.5em;
  top: 0em;
  margin-top: -0.5em;
}

.rightChar {
  position: relative;
  width: 100%;
}
.rightCharText {
  padding-right: 2.8em;
  white-space: pre-line;
  text-align: left;
  float: right;
}
.robotoLeft {
  font-family: "Roboto";
  font-size: 0.8em;
  padding-left: 3em; /*2.4/.8*/
}
.robotoRight {
  padding-right: 3em; /*2.4/.8*/
}
.roboto {
  font-family: "Roboto";
  font-size: 0.8em;
}
</style>