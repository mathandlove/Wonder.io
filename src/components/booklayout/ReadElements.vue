 <template>
  <div class="textContainer">
    <div
      v-for="(linePart, index) in textSeries(pageNum)"
      :key="linePart"
      class="textSeriesHolder"
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
          :style="{ width: 80 - (linePart.margin * 80) / 100 + 20 + '%' }"
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
          :style="{ width: 80 - (linePart.margin * 80) / 100 + 20 + '%' }"
          :class="{ robotoRight: linePart.fontStyle == 'Moboto SDF' }"
          :ref="'rtext' + index"
          :id="'rtext' + index"
        >
          <!-- {{ linePart.charPadding+ "\n\n" }} -->
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
    <div class="blankSpace" @click="increment" v-if="!seriesAllRead">
      <img
        src="@/assets/Images/Pencil.png"
        class="pencil"
        :class="{ animPencil: animatePencil }"
        v-if="pageNum === pageNumber"
      />
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
    ...mapGetters([
      "textSeries",
      "seriesAllRead",
      "animatePencil",
      "pageNumber",
    ]),
    ...mapState(["lineHeightPixels"]),
    debugText() {
      if (this.$refs.rchar1 != undefined)
        return this.$refs.rchar1.scrollHeight / this.lineHeightPixels;
      else {
        return "waiting";
      }
    },
  },
  mounted() {},
  methods: {
    increment(event) {
      event.stopPropagation();
      this.$store.dispatch("incrementTextRevealed");
    },
    adjustTextLine(refChar, refText) {
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
  flex-grow: 0;
}
.mainImage {
  padding-bottom: 0.5em;
  padding-top: 0.3em;
  width: 100%;
  object-fit: contain;
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

.textSeriesHolder {
  width: 100%;
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
  align-self: flex-end;
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
.blankSpace {
  width: 130%;
  flex-grow: 3;
  margin-top: -1.45em;
  margin-bottom: -1em;
  padding-top: 1.45em;
}

.textContainer {
  display: flex;
  flex-direction: column;
  align-items: start;
  height: 100%;
}
.blankSpace:hover {
  cursor: pointer;
}

.pencil {
  height: 2em;

  position: absolute;
  right: 20%;
  margin-top: 0;
  transform: rotate(-10deg);
}
.animPencil {
  animation: rotate 2.5s infinite;
  animation-delay: 03.5s;
}

@keyframes rotate {
  0% {
    transform: rotate(-10deg);
  }
  50% {
    transform: rotate(10deg);
  }

  100% {
    transform: rotate(-10deg);
  }
}
</style>