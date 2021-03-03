<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadPartialTorn.png"/>
  <div class="PageTextAlign">
    <div v-for="linePart in this.ParagraphDisplay" :key="linePart">
      <div v-if="linePart.words[0].includes('<im>')">
        <img :src="require(`../assets/Books/book${this.$store.state.BookID}/images/${
                this.imageNumber(linePart.words[0])}.png`)"
             alt=""
             :style="{height: this.imageHeight(linePart.words[0])*4.4+'vh'}"/>
      </div>
      <div v-else-if="linePart.words[0].includes('<l>')">
        <div class="bottomCharPadding d-flex justify-content-start">
          <img :src="require(`../assets/Books/book${this.$store.state.BookID}/characters/${
                  this.charImageLeft(linePart.words[0])}.png`)"
               alt=""
               class="charHeight"/>
          <div class="leftTextPadding textSize">
            {{this.charSpeech(linePart.words)}}
          </div>
        </div>
      </div>
      <div v-else-if="linePart.words[0].includes('<r>')">
        <div class="bottomCharPadding d-flex justify-content-between">
          <div class="rightTextPadding textSize">
            {{this.charSpeech(linePart.words)}}
          </div>
          <img :src="require(`../assets/Books/book${this.$store.state.BookID}/characters/${
                  this.charImageRight(linePart.words[0])}.png`)"
               alt=""
               class="charHeight"/>
        </div>
      </div>
      <div v-else>
        <div v-if="linePart.words[0].includes('Moboto')">
          <div class="textSizeRoboto" :style="{fontFamily: 'Roboto'}">
            {{robotoFont(linePart.words)}}
          </div>
        </div>
        <div v-else class="textSize">
          {{linePart.words.join(' ')}}
        </div>
      </div>
    </div>
    <div v-if="this.ParagraphCounter<this.ParagraphTotal" @click="this.incrementPageCounter">
      <img :src="require('../assets/Images/Pencil.png')" alt="" class="pencilAlign"/>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['ShowHand', 'show-hand'],
  props: {
    data: {
      type: Array,
      required: true,
    },
  },
  data() {
    const ParagraphCounter = 1;
    const ParagraphTotal = 1;
    const ParagraphDisplay = [];
    return { ParagraphCounter, ParagraphTotal, ParagraphDisplay };
  },
  created() {
    this.ParagraphTotal = this.data[0].lineParts.length;
    this.ParagraphDisplay.push(this.data[0].lineParts[0]);
    if (this.ParagraphTotal === 1) {
      this.$emit('show-hand', true);
    } else {
      this.$emit('show-hand', false);
    }
  },
  methods: {
    charImageLeft(inputString) {
      return inputString.split('<t>')[0].split('<l>')[1];
    },
    charImageRight(inputString) {
      return inputString.split('<t>')[0].split('<r>')[1];
    },
    charSpeech(inputArray) {
      return inputArray.join(' ').split('<t>')[1];
    },
    robotoFont(inputArray) {
      return inputArray.join(' ').split('>')[2];
    },
    imageNumber(inputString) {
      let tempNumber = inputString.slice(4, 6);
      if (tempNumber.includes('<')) { tempNumber = tempNumber.charAt(0); }
      return tempNumber;
    },
    imageHeight(inputString) {
      let tempHeight = inputString.charAt(inputString.length - 1);
      if (tempHeight > 6) { tempHeight = 6; }
      return tempHeight;
    },
    incrementPageCounter() {
      this.ParagraphDisplay.push(this.data[0].lineParts[this.ParagraphCounter]);
      this.ParagraphCounter += 1;
      if (this.ParagraphCounter === this.ParagraphTotal) {
        this.$emit('show-hand', true);
      }
    },
  },
};
</script>

<style scoped>
.PageTextAlign {
  position: absolute;
  top: 14.9vh;
  left: 49.3%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 37.8vh;
}
.textSize {
  text-align: left;
  font-size: 3.15vh;
}
.leftTextPadding {
  padding-left: 1vh;
}
.rightTextPadding {
  padding-right: 1vh;
  padding-left: 1vh;
}
.textSizeRoboto {
  text-align: left;
  font-size: 2.55vh;
}
.bottomCharPadding {
  padding-bottom: 4.8vh;
}
.charHeight {
  height: 9vh;
}
.pencilAlign {
  height: 4vh;
  padding-left: 75%;
}
</style>
