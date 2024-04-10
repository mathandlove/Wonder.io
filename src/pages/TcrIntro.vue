<template>
<img src="..\assets\prototoype\simplebg.jpg" class="backgroundImage">
    <img v-show="showLogo" src="..\assets\prototoype\logobw.png" class="centerLogo">
    <img v-show="showMainImage" :src="mainImage" class="mainImage">
    <iframe v-show="showMainVideo" class="mainVideo"  :src="mainVideoSource" title="YouTube video player" frameborder="0" allow=" clipboard-write; encrypted-media; " referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    <div class="mainText" >
      {{message}}
    </div>
    <div class="footer">
      <button  @click="Increment" class="nextButton">
          <img src="..\assets\Images\nextButton.png" class="buttonImage">
      </button>
    </div>
{{ count }}
</template>


<script>
import { reactive, ref } from 'vue'
import Photo1 from "@/assets/prototoype/example1.jpg";
import Photo2 from "@/assets/prototoype/example2.jpg";
import Photo3 from "@/assets/prototoype/example3.jpg";

export default {
  setup(){
    const photos =[Photo1,Photo2,Photo3];
    var count=ref(0);
    var message="";
    var mainImage=Photo1;
    var showLogo=true;
    var showMainImage=false;
    var showMainVideo=false;
    var mainVideoSource="https://www.youtube.com/embed/vtXuW0JTfig?si=1NQKxUo1ZQ9FhRVw&amp;controls=0"

    return {
      count, message, photos,mainImage,showLogo,showMainImage, mainVideoSource,showMainVideo
    }
  },
  props: {
    count2: {
      type: Number, // or the appropriate type for your data
      required: false, // or false, if the prop is optional
      default: 0
    }
  },
  data() {


    return {

    };
  },
  mounted(){
  this.Increment();
  },

  methods: {
    Increment (){

      if(this.count<this.count2)
      {
        this.count=this.count2;  // cheaty way to update count
      }
      this.showLogo=false;
      this.showMainImage=false;
      this.showMainVideo=false;
      this.message="";
      this.mainVideoSource="https://www.youtube-nocookie.com/embed/6c-VD86TKoU?si=qiTV_k4cAxkYXgOh&amp;controls=0"
      this.mainVideoSource="https://www.youtube.com/embed/vtXuW0JTfig?si=1NQKxUo1ZQ9FhRVw&amp;controls=0"
      if(this.count==0)
      {
        this.showLogo=true;
      }
      if(this.count==1)
  {
    this.showMainImage=true;
    this.message = "Every parent who has gone through this entire app has taught their kid to read. We believe in you and your child.";
    this.mainImage=this.photos[0];
  }
  else if (this.count==2)
  {
    console.log('designed100')
    this.showMainImage=true;
    this.message = "We've designed 100 activities to engage and teach your child in an accessible way.";
    this.mainImage=this.photos[1];
  }
  else if (this.count==3)
  {
    this.showMainImage=true;
    this.message = "These activities are science based and researched with parents like you.";
    this.mainImage=this.photos[2];
  }
  else if (this.count==4)
  {
    this.showMainVideo=true;

  }
  else if (this.count==5){
    this.$router.push({ name: 'Letter Quiz' });
  }
  else if (this.count==6){
    this.showMainVideo=true;
  }
  this.count++;
  console.log(this.count);
  console.log(this.count2);
  },
},
  
};



</script>

<style scoped>

.mainVideo{
  position: absolute;
 width: 80%;
 height: 80%;
 margin:5%;
}
.centerLogo{
  width: 300px;
  position: absolute;

  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.mainImage{
  width: 40%;
  position: absolute;

  top: 45%;
  left: 15%;
  transform: translate(-20%, -50%);
}

.mainText{
  width: 30%;
  position: absolute;

  top: 45%;
  left: 60%;
  transform: translate(-20%, -50%);
  font-family: 'Roboto'
}


.footer { 
    position: absolute; 
    bottom:0%; 
    width:100%;
}

.nextButton{
  margin: 0;
  border: none;
  padding: 0;
  background-color:transparent;
  width: 80px;
  height: 80px;
  margin-right:0%;
  display: float;
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


