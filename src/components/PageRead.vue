<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadPartialTorn.png"/>
  <div class="PageTextAlign">
    <div v-for="linePart in this.data[0].lineParts" :key="linePart">
      <div v-if="linePart.words[0].includes('<im>')">
        <img :src="require(`../assets/Books/book${bookNumber}/images/${
                this.imageNumber(linePart.words[0])}.png`)"
             alt=""
             :style="{height: this.imageHeight(linePart.words[0])*4.4+'vh'}"/>
      </div>
      <div v-else-if="linePart.words[0].includes('<l>')">
        <div class="bottomCharPadding d-flex justify-content-start">
          <img :src="require(`../assets/Books/book${bookNumber}/characters/${
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
          <img :src="require(`../assets/Books/book${bookNumber}/characters/${
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
        <div v-if="linePart.words[linePart.words.length-2].includes(`\n\n`)" class="BlnkLine"></div>
        <div v-if="linePart.words[linePart.words.length-1].includes(`\n\n`)" class="BlnkLine"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    data: {
      type: Array,
      required: true,
    },
    bookNumber: {
      type: String,
      required: true,
    },
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
.BlnkLine {
  height: 4.6vh;
}
</style>
