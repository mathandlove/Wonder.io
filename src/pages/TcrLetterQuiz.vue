<template>
<img v-show="false" src="..\assets\prototoype\simplebg.jpg" class="backgroundImage">
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
import { reactive, ref } from 'vue';
import { mapState, mapActions } from 'vuex';
/*

*/

export default {
  setup(){
    const showGrid=ref(false);
    var currentLetterIndex=0;
    var currentLetterDisplay = ref("test");
    var workOnArray=[];
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
      letterOrder,soundOrder,currentLetterDisplay, currentLetterIndex,letterLearned,showGrid,workOnArray
    }

  },
  data() {


    return {

    };
  },
  mounted(){
    this.UpdateLetter();
  },
  computed: {
    ...mapState(['tcrWorkOnLetters']), // Map the state to component's computed properties
  },
  methods: {
    ...mapActions(['tcrUpdateWorkOn']), // Map the action to component's methods

  },


  methods: {
    ...mapActions(['tcrUpdateWorkOn']),
    setWorkOn(newOrder)
    {
      this.tcrUpdateWorkOn(newOrder);
    },
    getStyle(index) {
    if(this.letterLearned[index]==0)
    {
      return { backgroundColor: '#BABDBF' };
    }
    else if (this.letterLearned[index]==2) 
      {
        return { backgroundColor: '#A3F26B' };
      }
      else if (this.letterLearned[index]== 1) {
        return { backgroundColor: '#F29727' };
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
    }, 500); 

    },
    DoesNotKnowLetter(){
      this.workOnArray.push(this.letterOrder[this.currentLetterIndex]);
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


    }, 500); // 2000 milliseconds = 2 seconds
  }
  else{
    setTimeout(() => {
        this.showGrid=false;
        this.setWorkOn(this.workOnArray)
        this.$router.push({ name: 'Introduction' ,params: { count2: Number(7) }});
    }, 500); // 2000 milliseconds = 2 seconds
  }

    },
    UpdateLetter(){
      var nLetter=this.letterOrder[this.currentLetterIndex];
      this.currentLetterDisplay=nLetter.toUpperCase();//+' '+nLetter.toLowerCase();
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
  grid-template-columns: repeat(4, 1fr); 
  grid-template-rows: repeat(7, 1fr);
  gap: 10px; /* Adjust the gap between items */
  margin:3%;
  padding: 3%;
  background-color:#BABDBF;
  border-radius: 30px;
  
}

.grid-item {
  border: 1px solid black;
  border-width:2px;
  padding: 2%;
  font-size: 30px;
  font-weight: bolder;
  display: flex; /* Use flexbox */
  align-items: center; /* Center items vertically */
  justify-content: center; /* Center items horizontally */
  border-radius: 20%;
  height:9vh;
  width: 9vh;
  z-index: 6;
}


.letterContainer{
  border-radius: 30px;
  height:60%;
  width:90%;
  margin: 5%;
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-55%, -50%);


  color:darkslateblue;
  font-size: 50vh;
  font-weight: bolder;
 line-height: 1.4;
 border-style:solid;
  border-color:darkslateblue;
  border-width: 7px;
  text-align: center; 
 

  
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
    height:18%;
    padding: 8%;
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
  margin: 2.5%;
  border: none;
  padding: 0;
  background-color:transparent;
  height: 15%;
  float: right;
  outline:none;
  

}
.audioButton:focus {
  outline: none;
  /* Add additional styling for the focused state */
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


