 <template>
  <div v-for="linePart in testData" :key="linePart" class="textContainer">
    <div
      v-if="
        linePart.type == 'character' && linePart.characterOrientation == 'l'
      "
      class="leftChar"
      :style="{
        minHeight: 1.45 * 3 - 0.1 + 'em',
      }"
    >
      <img :src="linePart.urlForCharacter" alt="" class="leftCharImage" />
      <div class="leftCharText">
        {{ linePart.text + "\n\n" }}
      </div>
    </div>

    <div
      v-if="
        linePart.type == 'character' && linePart.characterOrientation == 'r'
      "
      class="rightChar"
      :style="{
        minHeight: 1.45 * 3 - 0.1 + 'em',
      }"
    >
      <div class="rightCharText">
        {{ linePart.text + "\n\n" }}
      </div>
      <img :src="linePart.urlForCharacter" alt="" class="rightCharImage" />
    </div>

    <div v-if="linePart.type == 'text'" class="mainText">
      {{ linePart.text }}
    </div>
    <div v-if="linePart.type == 'image'">
      <img
        class="mainImage"
        :src="linePart.urlForImage"
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
      testData: [
        {
          type: "character",
          text: "The race is on how fast can elliott type. Hes doing it without even looking and he should probably go to bed soon.",
          characterOrientation: "r",
          urlForCharacter: require(`@/assets/Books/book10/characters/captain.png`),
          urlForImage: "",
          imgHeight: "",
          charPadding: 0,
          fontStyle: "",
        },
        {
          type: "character",
          text: "Short Text",
          characterOrientation: "r",
          urlForCharacter: require(`@/assets/Books/book10/characters/captain.png`),
          urlForImage: "",
          imgHeight: "",
          charPadding: 0,
          fontStyle: "",
        },
        {
          type: "character",
          text: "Longer Text but not that long.",
          characterOrientation: "r",
          urlForCharacter: require(`@/assets/Books/book10/characters/captain.png`),
          urlForImage: "",
          imgHeight: "",
          charPadding: 0,
          fontStyle: "",
        },
        {
          type: "text",
          text: "Aaron thanks for all your help making mre words hwerea asdfas asdthis look really good!",
          characterOrientation: "",
          urlForCharacter: "",
          urlForImage: "",
          imgHeight: "",
          charPadding: 0,
          fontStyle: "roboto",
        },
        // {
        //   type: "image",
        //   text: "",
        //   characterOrientation: "",
        //   urlForCharacter: "",
        //   urlForImage: require(`@/assets/Books/book10/images/2.png`),
        //   imgHeight: "7",
        // },

        // {
        //   type: "text",
        //   text: "Aaron thanks for all your help making this look really good!",
        //   characterOrientation: "",
        //   urlForCharacter: "",
        //   urlForImage: "",
        //   imgHeight: "",
        // },
        // {
        //   type: "text",
        //   text: "Aaron thanks for all your help making this look really good!",
        //   characterOrientation: "",
        //   urlForCharacter: "",
        //   urlForImage: "",
        //   imgHeight: "",
        // },

        // {
        //   type: "text",
        //   text: "Aaron thanks for all your help making this look really good!",
        //   characterOrientation: "",
        //   urlForCharacter: "",
        //   urlForImage: "",
        //   imgHeight: "",
        // },
      ],
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
};
</script>

<style scoped>
.mainText {
  white-space: pre-line;
  margin-bottom: 0em;
}
.mainImage {
  padding-bottom: 0.5em;
  padding-top: 0.3em;
  border: none;
  border-color: green;
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
  padding-right: 2.4em;
  white-space: pre-line;
  text-align: left;
}
</style>