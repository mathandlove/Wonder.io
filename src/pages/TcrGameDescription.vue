<template>
  <div>
  <div class="headerTitle">{{gameTitle}}</div>
  <div v-show="!isPlaying" class="item">

    <img :src="currentImageSrc" alt="item" @click="toggleVideo">
    <div class="playButton" @click="toggleVideo">
      <div class="playIcon"></div>
    </div>
  </div>

  <div v-show="isPlaying" class="mainVideo" @click="toggleVideo" @ended="handleVideoEnd">
    <video ref="videoPlayer">
      <source :src="currentVideoSrc" type="video/mp4">
      Your browser does not support the video tag.
    </video>
  </div>
  <div class="descriptionText">
    {{ gameDescription }}
  </div>
  <ul class="tips">
    <li v-for="bullet in bulletPointArray">{{bullet}}</li>
  </ul>
</div>
  <button class="nextButton" @click="turnOnFASQ">SHOW FAQ</button>
  <div v-show="showFAQ">
  <div class="descriptionText">What if I don’t have any letter sound flashcards?</div>
  <ul class="tips"><li >No problem! You can write the letters on anything (computer paper, post-its, envelopes, whiteboards) as long as your little one can see and read the letters. Remember: it’s not the flashcards that make this fun, it’s the game itself. So write down your three letters and get started!</li></ul>
  <div class="descriptionText">What do I do if my child does not like the activity?</div>
  <ul class="tips"><li >No worries! This happens sometimes. If your child is not enjoying the lesson, the first thing to check is your own energy and engagement. Are YOU enjoying the lesson? Are YOU bringing 100% energy to make it fun and engaging. If not, make sure to “get in character” and have some fun so your child can have fun too. If this still doesn’t work, try a different activity with your little one. Remember: they don’t need to like ALL of the games- you just need to find ONE that works</li></ul>
  <div class="descriptionText">What if they tell me the letter NAMES but not the SOUNDS?</div>
  <ul class="tips"><li >Try connecting the SOUNDS to the letter NAMES they already know. For example: You might say something like: “What letter is this?” They say A. And then you say “That’s right! The NAME of the letter is A. Now what SOUND does A make?” Then, you should be able to teach them that the A says "ah."</li></ul>
  <div class="descriptionText">How many minutes should I spend for each lesson?</div>
  <ul class="tips"><li >An amazing lesson usually takes about 2-5 minutes depending on your child’s level of focus and engagement. Remember: longer doesn’t always mean better. Your goal is simply to get your child looking at, saying, and learning the letter sounds as much as possible during your lesson. And after a few minutes of practice, you’re all set and can pick it back up the next day!</li></ul>
  <div class="descriptionText">How many days per week should we practice the sounds?</div>
  <ul class="tips"><li >It really depends on the kid and the situation. But the key is, you start small and try to build a routine. If you’re focused on the right activities, even for just a little bit of time, that will beat spending a lot of time on the wrong things. </li></ul>
  </div>
  
  <button class="fakeButton">REPORT SESSION</button>
  <button class="fakeButton">COMMENTS</button>
  <button @click="backToLibrary" class="nextButton">BACK TO LIBRARY</button>

</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  props: {
    gameTitle: {
      type: String,
      required: false,
      default: "Teach the Toy"
    },
    gameDescription: {
      type: String,
      required: false,
      default: "Teach the toy is a simple and effective way to help your little one learn their letter sounds. Simply ask your little one to pick their favorite toy and then instruct them to “teach” their letter sounds to that toy. This may include showing the sound to the toy, telling the toy what sound the letter makes, or giving the toy feedback if they’re getting the sound wrong! And if your child forgets the sound or needs help, quickly remind your child what sound the letter makes so they can get back to feeling like the “expert” teacher that they are!",
    },
    currentVideoSrc: {
      type: String,
      required: true,

    },
    currentImageSrc:{
      type: String,
      required: true,
    },
    bulletPointArray: {
      type: Array,
      required: false,
      default: function() {
        return ["Pick a toy they really like- this helps the activity!","Remind them of each sound before starting so they feel confident!",
      "Get into character and pretend to “speak” for the toy so it's more engaging!",
        "Pretend not to know the sound so they have to explain it even more!"]
      }
    }
  },
  setup(props) {
    return {}
  },
  data() {
    return {
      isPlaying: false,
      showFAQ:false,
    }
  },
  methods: {
    toggleVideo() {
        const video = this.$refs.videoPlayer;
        if (video.paused) {
            video.play();
            this.isPlaying = true;
            this.openFullscreen(video); // Trigger fullscreen upon playing
        } else {
            if (document.fullscreenElement) {
                this.closeFullscreen(); // Exit fullscreen when pausing
            }
            video.pause();
            this.isPlaying = false;
        }
    },
    openFullscreen(elem) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { /* Safari */
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE11 */
            elem.msRequestFullscreen();
        }
    },
    closeFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
    },
    handleVideoEnd() {
        this.isPlaying = false; // Resets the playing state
        if (document.fullscreenElement) {
            this.closeFullscreen(); // Exit fullscreen at the end of the video
        }
    },
    backToLibrary() {
        this.$router.push({ name: 'Library' });
    }
},

  watch: {
    '$route.query.gameTitle'(newTitle) {
      console.log('gameTitle changed to', newTitle); // Debug: Check if gameTitle updates
    }
  }
}

</script>

<style scoped>
.headerTitle {
  display: flex;
  /* Enables flexbox */
  justify-content: center;
  /* Center horizontally */
  align-items: center;
  /* Center vertically */
  height: 80px;
  /* Fixed height */
  color: black;
  font-size: 40px;
  font-weight: bold;
  font-family: 'Roboto', sans-serif;
  width: 100%;
  /* Ensures it takes full width of its container */


}
.descriptionText
{
  display: block;
  /* Enables flexbox */
  justify-content: left;
  /* Fixed height */
  color: black;
  font-size: 18px;
  font-family: 'Roboto', sans-serif;
  margin: 10%;

  
}

.tips{
  display: block;
  /* Enables flexbox */
  justify-content: left;
  /* Fixed height */
  color: black;
  font-size: 18px;
  font-weight: bold;
  font-family: 'Roboto', sans-serif;
  margin: 10%;
  margin-right:20%;

 
}
ul li{
  margin-bottom: 30px;
}

.playButton {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150px;
  /* Set a fixed size for the button */
  height: 150px;
  /* Set a fixed size for the button */
  background-color: rgba(0, 0, 0, 0.5);
  /* Semi-transparent black */
  border-radius: 50%;
  /* Circular shape */
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 2;
  /* Ensure it's above the image */

}


.playIcon {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 45px 0 45px 78px;
  /* Triangle size */
  border-color: transparent transparent transparent white;
  /* Only the left border has color */
  margin-left: 15px;
  /* Adjust this value to shift the triangle slightly to the right */
}

.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  /* This makes it the positioning context for the play button */
  margin: 20px;
  width: 90%;
  /* Adjust based on your layout needs */
  max-width: 600px;
  /* Optional: Provides a max width for larger screens */
}

.item img {
  width: 90%;
  /* Adjust the image size */
  height: 275px;
  cursor: pointer;
  object-fit: cover;
  /* Crop the image */
  overflow: hidden;
  /* Hide any overflowing content */
  border-radius: 10px;
  /* Optional: Add rounded corners */

}

.item p {
  margin-top: 10px;
  text-align: center;
  display: flex;
  /* Enables flexbox */
  justify-content: center;
  /* Center horizontally */
  align-items: top;
  /* Center vertically */
  height: 80px;
  /* Fixed height */
  color: black;
  font-size: 30px;
  font-weight: bold;
  font-family: 'Roboto', sans-serif;
  width: 100%;
  /* Ensures it takes full width of its container */
  margin-top: 2%;
  /* Adjusted to 0, change based on your layout needs */
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
    width: 100% !important; /* Full width */
    height: 100% !important; /* Full height */
    object-fit: cover; /* Preserve aspect ratio while filling screen */
}
.nextButton {
  background-color: #2F4157;
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
  margin-top: 30px;
  margin-bottom: 30px;
  position: relative;  
  left: 50%;  
  bottom: 3%;
}

.fakeButton {
  background-color: transparent;
    color: #2F4157; /* White text */
    border: 4px; /* No border */
    border-color:#2F4157;
    border-style:outset;
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
  margin-top: 30px;
  margin-bottom: 30px;
  position: relative;  
  left: 50%;  
  bottom: 3%;
}

</style>
