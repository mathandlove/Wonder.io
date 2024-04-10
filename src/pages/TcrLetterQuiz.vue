<template>
<img src="..\assets\prototoype\simplebg.jpg" class="backgroundImage">
<div  v-show="showGrid" class="grid-container">
    <div v-for="(letter,index) in letterOrder" class="grid-item" :style="getStyle(index)">
      {{letter.toUpperCase()}}
    </div>
  </div>

  <div v-show="!showGrid">
  <div class="letterContainer">
      {{currentLetterDisplay}}
    </div>

    <div class="topWindow">
      <button  @click="PlayPhoneme" class="audioButton">
          <img src="..\assets\Images\blackAudioOn.png" class="buttonImage">
      </button>
    </div>
    <div class="footer">
      <button  @click="KnowsLetter" class="checkButton">
          <img src="..\assets\prototoype\checkmark.png" class="buttonImage">
      </button>
      <button  @click="DoesNotKnowLetter" class="xButton">
          <img src="..\assets\prototoype\xCheckmark.png" class="buttonImage">
      </button>
    </div>
  </div>

</template>


<script>
import { reactive, ref } from 'vue'
/*

*/

export default {
  setup(){
    const showGrid=ref(false);
    var currentLetterIndex=0;
    var currentLetterDisplay = ref("test");
    const letterLearned=
    [
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
    ];
    var letterOrder= 
    [
    's',
'a',
't',
'm',
'o',
'p',
'b',
'i',
'n',
'r',
'e',
'd',
'c',
'u',
'f',
'j',
'k',
'l',
'h',
'v',
'z',
'w',
'g',
'y',
'x',
'q'

    ];

   var soundOrder=
   [

   'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2025.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%205.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2032.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2042.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2013a.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2030.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2031.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%202.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2043.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2039.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%203.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2033.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2034.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%209.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2021.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2037.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2034.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2041.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2029.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2022.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2026.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2038.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2035.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2040.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2034.mp3',
'https://thesoundofenglish.org/wp-content/uploads/in5-archives/interactive-ipa-chart-22/Interactive%20IPA%20Chart%2022/assets/media/SOUND%2034.mp3'


   ]

   return {
      letterOrder,soundOrder,currentLetterDisplay, currentLetterIndex,letterLearned,showGrid
    }

  },
  data() {


    return {

    };
  },
  mounted(){
    this.UpdateLetter();
  },

  methods: {
    getStyle(index) {
    if(this.letterLearned[index]==0)
    {
      return { backgroundColor: '#2E4559' };
    }
    else if (this.letterLearned[index]==2) 
      {
        return { backgroundColor: '#92D95F' };
      }
      else if (this.letterLearned[index]== 1) {
        return { backgroundColor: '#F27D16' };
      }
    },
    KnowsLetter(){
      this.letterLearned[this.currentLetterIndex]=2;
      this.currentLetterIndex++;
      this.UpdateLetter();
      this.showGrid=true;
      setTimeout(() => {
        this.showGrid=false;
      //this.delayedFunction();
    }, 1500); // 2000 milliseconds = 2 seconds

    },
    DoesNotKnowLetter(){
      this.letterLearned[this.currentLetterIndex]=1;
      this.currentLetterIndex++;
      this.UpdateLetter();
      this.showGrid=true;
      var numberOfMistakes=this.letterLearned.filter(element => element === 1).length;
      console.log("number of mistakes '" +numberOfMistakes);
    
      if(numberOfMistakes<3)
      {
      setTimeout(() => {
        this.showGrid=false;


    }, 1500); // 2000 milliseconds = 2 seconds
  }
  else{
    setTimeout(() => {
        this.showGrid=false;
        this.$router.push({ name: 'Introduction' ,params: { count2: Number(6) }});
    }, 1500); // 2000 milliseconds = 2 seconds
  }

    },
    UpdateLetter(){
      var nLetter=this.letterOrder[this.currentLetterIndex];
      this.currentLetterDisplay=nLetter.toUpperCase()+' '+nLetter.toLowerCase();
    },
    PlayPhoneme (){
      var phonemeSound = new Audio(this.soundOrder[this.currentLetterIndex]);
      phonemeSound.play();


      phonemeSound.addEventListener("canplaythrough", function () {
        setTimeout(function(){
          phonemeSound.pause();
        },
        2000);
}, false); 
    }
   
},
  
};



</script>

<style>
* {
  margin: 0;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(7, 1fr); 
  grid-template-rows: repeat(4, 1fr);
  gap: 10px; /* Adjust the gap between items */
  padding:2%;
  
}

.grid-item {
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.8);
  padding: 15%;
  font-size: 30px;
  font-weight: bolder;
  text-align: center;
  border-radius: 20%;
  z-index: 6;
}


.letterContainer{
  border-radius: 20%;
  height:90%;
  width:50%;
  position:absolute;
  margin-left:25%;
  margin-top: 2.5%;
  margin-bottom: 2.5%;

  background-color:darkslateblue;
  color:white;
  font-size: 50vh;
  font-weight: bolder;
  text-align: center;
 line-height: 1.8;

  
}
.fullBackground{
  position: absolute; 
  height: 100%;
  width: 100%;
}
.backgroundImage{
  position: absolute; 
  height: 100%;
  width: 100%;
  object-fit:fill;
}
.topWindow{
  position: absolute; 
    bottom:35%; 
    width:100%;
    height:65%;
    padding: 2.5%;
    background-color:transparent;
}
.footer { 
    position: absolute; 
    bottom:0%; 
    width:100%;
    height:35%;
    padding: 2.5%;
    padding-top: 0%;
    background-color: transparent;
}


.checkButton{
  margin: 0;
  border: none;
  padding: 0;
  background-color:transparent;
  height: 100%;
  display: float;
  float: right;
}
.xButton{
  margin: 0;
  border: none;
  padding: 0;
  background-color:transparent;
  height: 100%;
  display: float;
  float: left;
}
.audioButton{
  margin: 0;
  border: none;
  padding: 0;
  background-color:transparent;
  height: 50%;
  float: right;

  

}

.buttonImage{
  width:100%;
  height:100%

}
.blueBackground {
  background-color: #96c5c2;
  height: 100vh;
  width: 100vw;
}
.topPadding {
  height: 20vh;
  display: flex;
  justify-content: start;
  align-items: center;
}

.ChalkboardBasics {
  margin-left: 5vw;
  margin-right: 5vw;
  background-size: 100%;
  background-repeat: no-repeat;
  overflow: none;
}
.ChalkboardWide {
  height: 100%;
  padding-left: 8vw;
  padding-right: 8vw;
  padding-top: 8vh;
  background-image: url("../assets/Images/Chalkboard.png");
  background-repeat: no-repeat;
  background-size: 100% 110%;
}

.textThickness {
  font-weight: 900;
  font-size: min(3vw, 5vh);
}

.NavWonderLogo {
  width: 300px;
  object-fit: contain;
  margin-left: 5%;
}

.gradeGrid {
  display: grid;
  grid-template-columns: repeat(4, 25%);
  grid-template-rows: repeat(2, 45%);
  justify-items: center;
  align-items: center;
  justify-content: center;

  width: 100%;
  height: 80vh;

  padding-bottom: 10vh;
}
@media (max-aspect-ratio: 857/847) {
  .gradeGrid {
    grid-template-columns: repeat(3, 33%);
    grid-template-rows: repeat(3, 33%);
  }
  .ChalkboardWide {
    background-image: url("../assets/Images/phoneBoard.png");
    padding-top: 5vh;
    height: 85vh;
  }
  .topPadding {
    height: 15vh;
  }
}

@media (max-aspect-ratio: 510/824) {
  .gradeGrid {
    grid-template-columns: repeat(2, 50%);
    grid-template-rows: repeat(4, 20%);
    padding-bottom: 0%;
  }
  .ChalkboardWide {
    background-image: url("../assets/Images/phoneBoard.png");
    height: 90vh;
    padding-left: 5vw;
    padding-right: 5vw;
  }
  .topPadding {
    height: 10vh;
  }

  .NavWonderLogo {
    height: 5vh;
    width: 40%;
  }
}
</style>


