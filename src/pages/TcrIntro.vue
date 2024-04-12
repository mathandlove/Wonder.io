<template>
  <img v-show="showLogo" src="..\assets\prototoype\logobw.png" class="centerLogo">
  <div class="MessageContainer">
    <div v-show="showMainImage" class="headerTitle">
      {{ headerWords }}
    </div>
    <img v-show="showMainImage" :src="mainImage" class="mainImage">
      <div v-show="showMainVideo" class="mainVideo" @click="toggleVideo" @ended="handleVideoEnd">
        <video  ref="videoPlayer" >
          <source :src="currentVideoSrc" type="video/mp4" >
            Your browser does not support the video tag.
        </video>
        <div v-show="!isPlaying" class="playButton"><div class="playIcon"></div></div>
    </div>
    <div class="mainText">
      {{ message }}
    </div>
    <button @click="Increment" class="nextButton">CONTINUE</button>
  </div>

</template>


<script>
import { reactive, ref } from 'vue'
import Photo1 from "@/assets/prototoype/example1.png";
import Photo2 from "@/assets/prototoype/example2.png";
import Photo3 from "@/assets/prototoype/example3.png";
import Photo4 from "@/assets/prototoype/example4.png";
/*
    <iframe v-show="showMainVideo" class="mainVideo" :src="mainVideoSource" title="YouTube video player" frameborder="0"
      allow=" clipboard-write; encrypted-media; " referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen></iframe>
      */
export default {
  setup() {
    const photos = [Photo1, Photo2, Photo3, Photo4];
    var count = ref(0);
    var message = ref("");
    var headerWords = ref("");
    var mainImage = Photo1;
    var showLogo = ref(true);
    var showMainImage = false;
    var showMainVideo = false;

    return {
      count, message, photos, mainImage, showLogo, showMainImage, showMainVideo, headerWords
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
      isPlaying: false,
      currentVideoSrc: 'https://wondersa.blob.core.windows.net/tcrmedia/soundAssesment.mp4'  // Default video source
    }
  },
  mounted() {
    this.Increment();
  },

  methods: {
    toggleVideo() {
      const video = this.$refs.videoPlayer;
      if (video.paused) {
        video.play();
        this.isPlaying = true;
      } else {
        video.pause();
        this.isPlaying = false;
      }
    },
    handleVideoEnd() {
      this.isPlaying = false; // Resets the playing state
    },
    Increment() {


      if (this.count < this.count2) {
        this.count = this.count2;  // cheaty way to update count
      }
      this.showLogo = false;
      this.showMainImage = false;
      this.showMainVideo = false;
      this.message = "";
      var message = ref("");
    var headerWords = ref("");


      if (this.count == 0) {
        this.showLogo = true;
      }
      if (this.count == 1) {
        this.showMainImage = true;
        this.headerWords = "Fast 5 Minute Lessons";
        this.message = "All of our lessons are FAST and flexible so you can teach your child to read in just 2-5 minutes a day!";
        this.mainImage = this.photos[0];
      }
      else if (this.count == 2) {
        this.showMainImage = true;
        this.headerWords = "Fun Games for All";
        this.message = "Get instant access to our library of FUN learning games to find the perfect activity for your little one!";
        this.mainImage = this.photos[1];
      }
      else if (this.count == 3) {
        this.showMainImage = true;
        this.headerWords = "Teaching Made Easy";
        this.message = "“Spencer is such a great teacher! The course itself is well thought out and super easy to follow for parents like me without teaching or early childhood development experience.” -Shannon H";
        this.mainImage = this.photos[2];
      }
      else if (this.count == 4) {
        this.showMainImage = true;
        this.headerWords = "Effective for All Learners";
        this.message = "Toddlers Can Read helps you teach your child to read faster and more effectively than any traditional school, daycare, app, or curriculum.";
        this.mainImage = this.photos[3];

      }

      else if (this.count == 5) {
        this.showMainVideo = true;
        this.currentVideoSrc='https://wondersa.blob.core.windows.net/tcrmedia/soundAssesment.mp4';
      }
      else if (this.count == 6) {
        this.$router.push({ name: 'Letter Quiz' });
      }
      else if (this.count == 7) {
        this.showMainVideo = true;
        this.currentVideoSrc='https://wondersa.blob.core.windows.net/tcrmedia/gameExplain.mp4';
      }
      else if (this.count == 8) {
        this.$router.push({ name: 'Library' });
      }

      console.log(this.count);
      console.log(this.count2);
      this.count++;
    },
  },

};



</script>

<style scoped>

.playButton {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150px; /* Increased size of the button */
  height: 150px; /* Increased size of the button */
  background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
  border-radius: 50%; /* Circular shape */
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: white; /* Color of the icon */
  font-size: 72px; /* Increased icon size */
}


.playIcon {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 45px 0 45px 78px; /* Triangle size */
  border-color: transparent transparent transparent white; /* Only the left border has color */
  margin-left: 15px; /* Adjust this value to shift the triangle slightly to the right */
}

.messageContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  height: 100%;
  /* Adjust height accounting for header */
}

.headerTitle {
  display: flex;           /* Enables flexbox */
  justify-content: center; /* Center horizontally */
  align-items: center;     /* Center vertically */
  height: 80px;            /* Fixed height */
  color: black;
  font-size: 20px;
  font-weight: bold;
  font-family: 'Roboto', sans-serif;
  width: 100%;             /* Ensures it takes full width of its container */
  margin-top: 2%;           /* Adjusted to 0, change based on your layout needs */
  
}

.backgroundImage {
  position: absolute;
  height: 100%;
  width: 100%;
  object-fit: fill;
  z-index: -1;
}

.mainVideo {
  position: relative;        /* Keeps the element in the document flow */
  width: 90%;  
  height: 75vh;              /* Adjust the width to your preference */
  left: 50%;                 /* Centering horizontally */
  transform: translateX(-50%); /* More precise horizontal centering */
  display: block;            /* Ensures it takes a new line */
  overflow: hidden;          /* Hide anything outside the bounds */

  margin-top:5%;
  border-radius: 30px;

}

video {
  position: absolute;        /* Absolute position within the .mainVideo div */
  top: 0;
  left: 0;
  width: 100%;               /* Full width of the container */
  height: 100%;              /* Full height of the container */
}

.centerLogo {
  width: 70%;
  position: absolute;

  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.mainImage {
  width: 80%;            /* Control the image width */
  position: relative;    /* Relative to its normal position */
  left: 50%;             /* Move to the middle of its container */
  transform: translateX(-50%); /* Shift it back by half of its width */
  display: block;        /* Ensures the image is treated as a block element for margin auto to work */
  border-radius: 5%;
}

.mainText {
  width: 80%;            /* Control the image width */
  padding-top: 6%;
  position: relative;    /* Relative to its normal position */
  left: 50%;             /* Move to the middle of its container */
  transform: translateX(-50%); /* Shift it back by half of its width */
  display: block;        /* Ensures the image is treated as a block element for margin auto to work */
  font-family: 'Roboto'
}


.footer {
  position: absolute;
  bottom: 0%;
  width: 100%;
}

.nextButton {
  background-color:#2F4157;
    color: white; /* White text */
    border: none; /* No border */
    padding: 10px 20px; /* Top and bottom padding 10px, left and right padding 20px */
    font-size: 25px; /* Text size */
    font-weight: bold; /* Bold text */
    cursor: pointer; /* Pointer cursor on hover */
    transition: background-color 0.3s, transform 0.2s; /* Smooth transition for hover effects */
    font-family: 'Roboto';
  width: 80%;            /* Control the image width */
  height: 10vh;   /* Relative to its normal position */           /* Move to the middle of its container */
  transform: translateX(-50%); /* Shift it back by half of its width */
  display: block;        /* Ensures the image is treated as a block element for margin auto to work */
  border-radius: 10px;
  margin-top: 10%;
  position: fixed;  
  left: 50%;  
  bottom: 3%;
}

.buttonImage {
  width: 100%;
  height: 100%
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
}</style>


