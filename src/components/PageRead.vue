<template>
  <img alt="" class="h-100" src="../assets/Images/notepadWithLines.png"/>
  <div class="PageTextAlign">
    <div v-for="pagePart in this.data" :key="pagePart">
      <div v-if="pagePart.lineParts[0].words[0].includes('<im>')">
        <img :src="require(`../assets/Books/book${bookNumber}/images/${
                pagePart.lineParts[0].words[0].charAt(4)}.png`)"
             alt=""
             class="w-100 py-2"
             :style="{height: pagePart.lineParts[0].words[0].charAt(13)*5+'vh'}"/>
      </div>
      <div v-else-if="pagePart.lineParts[0].words[0].includes('<l>')">
        <div class="row py-2">
          <img :src="require(`../assets/Books/book${bookNumber}/characters/${
                  this.charImageLeft(pagePart.lineParts[0].words[0])}.png`)"
               alt=""
               class="charHeight col-3"/>
          <div class="textSize col-8">
            {{this.charSpeech(pagePart.lineParts[0].words)}}
          </div>
        </div>
      </div>
      <div v-else-if="pagePart.lineParts[0].words[0].includes('<r>')">
        <div class="row py-2">
          <div class="col-1 m-0 p-0"/>
          <div class="textSize col-8">
            {{this.charSpeech(pagePart.lineParts[0].words)}}
          </div>
          <img :src="require(`../assets/Books/book${bookNumber}/characters/${
                  this.charImageRight(pagePart.lineParts[0].words[0])}.png`)"
               alt=""
               class="charHeight col-3"/>
        </div>
      </div>
      <div v-else-if="pagePart.lineParts[0].words[0].includes('Moboto')">
        <div class="textSize py-2" :style="{fontFamily: 'Roboto'}">
          {{robotoFont(pagePart.lineParts[0].words)}}
        </div>
      </div>
      <div v-else class="textSize py-2">{{pagePart.lineParts[0].words.join(' ')}}</div>
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
  created() {
    console.log('Read_Page data is =', this.data);
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
  top: 14.5vh;
  left: 50%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 43vh;
}
.textSize {
  text-align: left;
  font-size: 2.5vh;
  padding: 0;
}
.charHeight {
  height: 7.5vh;
}
</style>
