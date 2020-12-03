<template>
  <img alt="" class="h-100" src="../assets/Images/NotepadPartialTorn.png"/>
  <div class="PageTextAlign">
    <div v-for="(pagePart,index) in this.data" :key="pagePart">
      <div v-if="pagePart.lineParts[0].words[0].includes('<im>')">
        <img :src="require(`../assets/Books/book${bookNumber}/images/${
                pagePart.lineParts[0].words[0].charAt(4)}.png`)"
             alt=""
             class="w-100"
             :style="{height: pagePart.lineParts[0].words[0].charAt(13)*4.7+'vh'}"/>
      </div>
      <div v-else-if="pagePart.lineParts[0].words[0].includes('<l>')">
        <div class="row textSize bottomCharPadding">
          <img :src="require(`../assets/Books/book${bookNumber}/characters/${
                  this.charImageLeft(pagePart.lineParts[0].words[0])}.png`)"
               alt=""
               class="charHeight col-3"/>
          <div class="col-8">
            {{this.charSpeech(pagePart.lineParts[0].words)}}
          </div>
        </div>
      </div>
      <div v-else-if="pagePart.lineParts[0].words[0].includes('<r>')">
        <div class="row textSize bottomCharPadding">
          <div class="col-1 m-0 p-0"/>
          <div class=" col-8">
            {{this.charSpeech(pagePart.lineParts[0].words)}}
          </div>
          <img :src="require(`../assets/Books/book${bookNumber}/characters/${
                  this.charImageRight(pagePart.lineParts[0].words[0])}.png`)"
               alt=""
               class="charHeight col-3"/>
        </div>
      </div>
      <div v-else-if="this.data[index+1]">
        <div v-if="this.data[index+1].lineParts[0].words[0].includes('<im>')">
          <div v-if="pagePart.lineParts[0].words[0].includes('Moboto')">
            <div class="textSizeRoboto" :style="{fontFamily: 'Roboto'}">
              {{robotoFont(pagePart.lineParts[0].words)}}
            </div>
          </div>
          <div v-else class="textSize">
            {{pagePart.lineParts[0].words.join(' ')}}
          </div>
        </div>
        <div v-else>
          <div v-if="pagePart.lineParts[0].words[0].includes('Moboto')">
            <div class="textSizeRoboto bottomPaddingRoboto" :style="{fontFamily: 'Roboto'}">
              {{robotoFont(pagePart.lineParts[0].words)}}
            </div>
          </div>
          <div v-else class="textSize bottomPadding">
            {{pagePart.lineParts[0].words.join(' ')}}
          </div>
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
  top: 14.2vh;
  left: 50%;
  transform: translate(-50%);
  width: 100vh;
  max-width: 38vh;
}
.textSize {
  text-align: left;
  font-size: 3.15vh;
}
.textSizeRoboto {
  text-align: left;
  font-size: 3.1vh;
}
.bottomPadding {
  padding-bottom: 2.5rem;
}
.bottomPaddingRoboto {
  padding-bottom: 3rem;
}
.bottomCharPadding {
  padding-bottom: 2.5rem;
}
.charHeight {
  height: 7.5vh;
}
</style>
