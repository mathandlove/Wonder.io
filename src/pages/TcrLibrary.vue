<template>
    <div class="headerTitle">
      Choose a Letter Game for Today!
    </div>
    <div class="flex-container">
        <div class="title">Your 3 Sounds:</div>
        <div class="grid-container">
            <div v-for="(letter, index) in letterOrder" :key="index" class="grid-item">
                {{ letter.toUpperCase() }}
            </div>
        </div>
    </div>
    <div class="scrollable-section">
      <div class="item"  @click="gotoGame(1)">
        <img src="..\assets\prototoype\game1.jpg" alt="item">
        <p>Teach the Toy</p>
      </div>
      <div class="item" @click="gotoGame(2)">
        <img src="..\assets\prototoype\game2-2.png" alt="item">
        <p>Throw the Sound</p>
      </div>
      <div class="item" @click="gotoGame(3)">
        <img src="..\assets\prototoype\game3.jpg" alt="item">
        <p>Floor is Lava</p>
      </div>
      <div class="item" @click="gotoGame(4)">
        <img src="..\assets\prototoype\game4.jpg" alt="item">
        <p>Run to the Sound</p>
      </div>
    </div>


</template>


<script>
import { reactive, ref } from 'vue'
import { mapState, mapActions } from 'vuex';
export default {
  setup() {

    var letterOrder= ref(
    [
    's',
'a',
't',


    ]);


    return {
letterOrder
    }
  },
  props: {
    count2: {

    }
  },
  data() {
    return {

    }
  },
  mounted() {
this.tester();
  },

  computed: {
    ...mapState(['tcrWorkOnLetters']), // Map the state to component's computed properties
  },
  methods: {
    ...mapActions(['tcrUpdateWorkOn']), // Map the action to component's methods
    // Other methods in your component
    tester()
    {
      this.letterOrder=this.tcrWorkOnLetters;
    },
    gotoGame(gameNumber=2)
    {
      if (gameNumber == 1) {
        this.$router.push({
          name: 'Game',
          params: {
            gameTitle: "Teach the Toy",
            gameDescription: "Teach the toy is a simple and effective way to help your little one learn their letter sounds. Simply ask your little one to pick their favorite toy and then instruct them to “teach” their letter sounds to that toy. This may include showing the sound to the toy, telling the toy what sound the letter makes, or giving the toy feedback if they’re getting the sound wrong! And if your child forgets the sound or needs help, quickly remind your child what sound the letter makes so they can get back to feeling like the “expert” teacher that they are!",
            currentVideoSrc: "https://wondersa.blob.core.windows.net/tcrmedia/game1.mp4",
            currentImageSrc: require("../assets/prototoype/game1.jpg"),
            bulletPointArray: ["Pick a toy they really like- this helps the activity!", "Remind them of each sound before starting so they feel confident!",
              "Get into character and pretend to “speak” for the toy so it's more engaging!",
              "Pretend not to know the sound so they have to explain it even more!"]
          }
        }
        );

      }
      else if (gameNumber == 2) {
        this.$router.push({
          name: 'Game',
          params: {
            gameTitle: "Throw the Sound",
            gameDescription: "Throw the Sound is one of the quickest and easiest way to teach your little one their letter sounds. Simply display the sounds your little one is working on and ask them to throw the sound after they say it! There are no limits here in terms of how your little one can play this game: they can do it inside or outside, standing up or sitting down, aiming at targets or throwing randomly. Just make sure they are looking at and correctly saying each sound before they throw it!",
            currentImageSrc: require("../assets/prototoype/game2-2.png"),
            currentVideoSrc: "https://wondersa.blob.core.windows.net/tcrmedia/game2.mp4",
            bulletPointArray: ["To make it easier, YOU can tell them which sound you want them to find and throw.", "To make it harder, have THEM identify and say each of the sounds on their own before throwing.",
              "Celebrate their throws so they want to move on to the next sound and do it again!",
              "Using thicker letters or flashcards that will fly further can make this game more fun!"]
          }
        }
        );

      }
      else if (gameNumber == 3) {
        this.$router.push({
          name: 'Game',
          params: {
            gameTitle: "Floor is Lava",
            gameDescription: "This is an adaptation of the popular children’s game: The Floor is Lava. In this game, all you need to do is spread out the letter sounds your little one is working on across the floor and tell them that the floor is lava and in order to stay safe, they need to be standing on a letter. But here’s the catch: they need to say the sound of the letter out loud before they can move onto the next letter. That way, they are looking at and saying each of the sounds as they jump from letter to letter keeping themselves safe from the lava below!",
            currentImageSrc: require("../assets/prototoype/game3.jpg"),
            currentVideoSrc: "https://wondersa.blob.core.windows.net/tcrmedia/game3.mp4",
            bulletPointArray: ["Adding in a few letter sounds they already know can give them more safe spaces to move to", "You can also write each sound 2-3x to give additional safe spaces as well",
              "Bigger things like computer paper or whiteboards can give a larger landing area",
              "You can make the game easier or harder by putting the letters closer together or further apart on the floor."]
          }
        }
        );

      }
      else if (gameNumber == 4) {
        this.$router.push({
          name: 'Game',
          params: {
            gameTitle: "Run to the Sound",
            gameDescription: "This game requires very, very little set-up and is often a child favorite! Simply pick the 3 letter sounds your child is working on, spread them out in different places, and have your child run to and say each of the sounds! You can tape them up high for them to run to and hit, or place them on the floor for them to run to and jump on. This can be done inside or outside, from close or from far away. Just make sure your little one correctly identifies and says each of the sounds that they run to!",
            currentImageSrc: require("../assets/prototoype/game4.jpg"),
            currentVideoSrc: "https://wondersa.blob.core.windows.net/tcrmedia/game4.mp4",
            bulletPointArray: ["To make it easier, YOU can tell them which sound you want them to run to.",
              "To make it harder, have THEM identify and say the sound on their own before running.",
              "Increasing the running distance can help your child be more energetic and happy!",
            "Challenging them to run faster and faster can also increase their focus and engagement!"]
          }
        }
        );

      }





  },
}

};



</script>

<style scoped>

.scrollable-section {
  overflow-y: auto;
  height: calc(100vh - 200px); /* Adjust the height according to your needs */
}

.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 20px;
}

.item img {
  width: 90%; /* Adjust the image size */
  height: 275px;
  cursor: pointer;
  object-fit: cover; /* Crop the image */
  overflow: hidden; /* Hide any overflowing content */
  background-position: center bottom;
  border-radius: 10px; /* Optional: Add rounded corners */
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center bottom; /* Crop from the bottom */
}

.item p {
  margin-top: 10px;
  text-align: center;
  display: flex;           /* Enables flexbox */
  justify-content: center; /* Center horizontally */
  align-items: top;     /* Center vertically */
  height: 80px;            /* Fixed height */
  color: black;
  font-size: 30px;
  font-weight: bold;
  font-family: 'Roboto', sans-serif;
  width: 100%;             /* Ensures it takes full width of its container */
  margin-top: 2%;           /* Adjusted to 0, change based on your layout needs */
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr); 
  grid-template-rows: repeat(1, 1fr);
  gap: 10px; /* Adjust the gap between items */
  padding: 3%;
  background-color:#BABDBF;
  border-radius: 15px;
  margin-right:10%;
  
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
  background-color: #F29727;
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
 
  
}



.flex-container {
  display: flex;
  align-items: center; /* Align vertically at center */
  justify-content: start; /* Start alignment horizontally */

}

.title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-left:5%;
  font-family: 'Roboto', sans-serif;
}
</style>


