<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadPartialTorn.png"/>
  <div class="PageTextAlign"
       :style="{'top': this.$store.state.AspectRatio > 2 ? '11vh' : '13.8vh'}">
    <div v-for="linePart in this.ParagraphDisplay" :key="linePart">
      <div v-if="linePart.words.length < 1"
           :style="{'padding-bottom': this.$store.state.AspectRatio > 2 ? '3.1vh' : '4.4vh'}"
      />
      <div v-else-if="linePart.words[0].includes('<im>')">
        <img :src="require(`../assets/Books/book${this.$store.state.BookID}/images/${
                this.imageNumber(linePart.words[0])}.png`)" alt=""
             :style="{
                      height: this.$store.state.AspectRatio > 2
                         ? this.imageHeight(linePart.words[0])*3.6+'vh'
                         : this.imageHeight(linePart.words[0])*4.4+'vh',
                       'margin-bottom': this.$store.state.AspectRatio > 2 ? '-0.2vh' : '0.2vh'}"/>
      </div>
      <div v-else-if="linePart.words[0].includes('<l>')">
        <div class="d-flex justify-content-start"
             :class="[this.$store.state.AspectRatio > 2 ? 'CharPaddingB2' : 'CharPaddingB1']">
          <img :src="require(`../assets/Books/book${this.$store.state.BookID}/characters/${
                  this.charImageLeft(linePart.words[0])}.png`)" alt=""
               :class="[this.$store.state.AspectRatio > 2 ? 'CharHeight2' : 'CharHeight1']"/>
          <div class="leftTextPadding"
               :class="[this.$store.state.AspectRatio > 2 ? 'TextSize2' : 'TextSize1']">
            {{this.charSpeech(linePart.words)}}
          </div>
        </div>
      </div>
      <div v-else-if="linePart.words[0].includes('<r>')">
        <div class="d-flex justify-content-between"
             :class="[this.$store.state.AspectRatio > 2 ? 'CharPaddingB2' : 'CharPaddingB1']">
          <div class="rightTextPadding"
               :class="[this.$store.state.AspectRatio > 2 ? 'TextSize2' : 'TextSize1']">
            {{this.charSpeech(linePart.words)}}
          </div>
          <img :src="require(`../assets/Books/book${this.$store.state.BookID}/characters/${
                  this.charImageRight(linePart.words[0])}.png`)" alt=""
               :class="[this.$store.state.AspectRatio > 2 ? 'CharHeight2' : 'CharHeight1']"/>
        </div>
      </div>
      <div v-else>
        <div v-if="linePart.words[0].includes('Moboto')">
          <div :class="[this.$store.state.AspectRatio > 2 ? 'RobotoSize2' : 'RobotoSize1']"
               :style="{fontFamily: 'Roboto'}">
            {{robotoFont(linePart.words)}}
          </div>
        </div>
        <div v-else :class="[this.$store.state.AspectRatio > 2 ? 'TextSize2' : 'TextSize1']">
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
    this.ParagraphTotal = this.data.length;
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
      if (this.data[this.ParagraphCounter - 1].lineParts[1]) {
        this.ParagraphDisplay.push({ words: [] });
      }
      this.ParagraphDisplay.push(this.data[this.ParagraphCounter].lineParts[0]);
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
  left: 49%;
  transform: translate(-50%);
  width: 100vh;
  max-width: min(37vh,69vw);
}
.TextSize1 {
  padding-top: 0.2vh;
  text-align: left;
  font-size: 3.00vh;
}
.TextSize2 {
  padding-top: 0.3vh;
  text-align: left;
  font-size: 2.4vh;
  line-height: 1.55;
}
.leftTextPadding {
  padding-left: min(1vh,1.8vw);
}
.rightTextPadding {
  padding-right: min(1vh,1.8vw);
  padding-left: min(1vh,1.8vw);
}
.RobotoSize1 {
  text-align: left;
  font-size: 2.6vh;
  line-height: 1.75;
}
.RobotoSize2 {
  text-align: left;
  font-size: 2.4vh;
  line-height: 1.55;
}
.CharPaddingB1 {
  padding-bottom: 4.5vh;
}
.CharPaddingB2 {
  padding-bottom: 3.3vh;
}
.CharHeight1 {
  height: 9vh;
}
.CharHeight2 {
  height: 7.5vh;
}
.pencilAlign {
  height: min(4vh,8vw);
  padding-left: 75%;
}
</style>
