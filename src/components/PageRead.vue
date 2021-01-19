<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadPartialTorn.png"/>
  <div class="PageTextAlign">
    <div v-for="pagePart in this.data" :key="pagePart">
      <div v-if="pagePart.lineParts[0].words[0].includes('<im>')">
        <img :src="require(`../assets/Books/book${bookNumber}/images/${
                pagePart.lineParts[0].words[0].charAt(4)}.png`)"
             alt=""
             :style="{height: pagePart.lineParts[0].words[0].charAt(
               pagePart.lineParts[0].words[0].length-1)*4.4+'vh'}"/>
      </div>
      <div v-else-if="pagePart.lineParts[0].words[0].includes('<l>')">
        <div class="bottomCharPadding d-flex justify-content-start">
          <img :src="require(`../assets/Books/book${bookNumber}/characters/${
                  this.charImageLeft(pagePart.lineParts[0].words[0])}.png`)"
               alt=""
               class="charHeight"/>
          <div class="leftTextPadding textSize">
            {{this.charSpeech(pagePart.lineParts[0].words)}}
          </div>
        </div>
      </div>
      <div v-else-if="pagePart.lineParts[0].words[0].includes('<r>')">
        <div class="bottomCharPadding d-flex justify-content-between">
          <div class="rightTextPadding textSize">
            {{this.charSpeech(pagePart.lineParts[0].words)}}
          </div>
          <img :src="require(`../assets/Books/book${bookNumber}/characters/${
                  this.charImageRight(pagePart.lineParts[0].words[0])}.png`)"
               alt=""
               class="charHeight"/>
        </div>
      </div>
      <div v-else>
        <div v-if="pagePart.lineParts[0].words[0].includes('Moboto')">
          <div class="textSizeRoboto" :style="{fontFamily: 'Roboto'}">
            {{robotoFont(pagePart.lineParts[0].words)}}
          </div>
        </div>
        <div v-else class="textSize">
          {{pagePart.lineParts[0].words.join(' ')}}
        </div>
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
  font-size: 2.6vh;
}
.bottomCharPadding {
  padding-bottom: 4.8vh;
}
.charHeight {
  height: 9vh;
}
</style>
