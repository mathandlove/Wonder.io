 <template>
  <div
    v-for="(linePart, index) in textSeries"
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
        :ref="'rchar' + index"
      >
        {{ linePart.text + "\n\n" }}
      </div>
      <img :src="linePart.characterImageUrl" alt="" class="rightCharImage" />
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
        :style="{ height: 1.45 * linePart.imgHeight - 0.1 + 'em' }"
      />
      <!-- lineHieght*imgHeight-descenderHeight -->
    </div>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
export default {
  components: {},
  data() {
    return {
      singleCharLine: "joy",
    };
  },
  methods: {
    setupNIV() {},
  },
  mounted() {},
  dismounted() {},
  computed: {
    ...mapGetters(["textSeries"]),
  },
  method: {},
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