<template>
  <the-background>
    <MainNavBar @show-modal="this.ViewRestartModal = true" />
    <notebook-page> </notebook-page>
    <div class="footer hasBorder">
      <div
        class="col-6 d-flex align-items-center justify-content-center j h-100"
      >
        <score-bar :points="99000"></score-bar>
      </div>
      <div class="col-6"></div>
    </div>
  </the-background>
</template>


<!--


<template>
  <body id="b1">
    <div class="border border-secondary" style="height: 20%"></div>

    <div id="play">
      <img id="time" src="@/assets/Images/notepadWithLines.png" />
    </div>
  </body>
</template>

<template>
  <div class="JoinBackGround">
    <div class="container w-100">
      <MainNavBar />
      <div class="row">
        <div class="col-12 col-lg-3" />
        <div class="col-12 col-lg-6 text-center">
          <div class="JoinTextStyling">Join the game</div>
          <form>
            <input
              type="text"
              class="JoinInputStyle"
              placeholder="Enter Nickname"
              v-model="userName"
              autocomplete="off"
            />
            <div />
            <button
              v-if="userName"
              type="submit"
              class="JoinButtonStyle RobotoFont"
              @click="HandleLetsGo"
            >
              LET'S GO!
            </button>
            <div v-else class="JoinButtonStyle" />
          </form>
        </div>
        <div class="col-12 col-lg-3 DetailsTopPadding">
          <h3 class="text-center text-lg-left">[Arrow] In this Book</h3>
          <div class="RobotoFont py-2 text-center text-lg-left">
            <strong>{{ getBookInfo().title[0] }}</strong>
          </div>
          <div class="row py-2 RobotoFont">
            <div class="col-6 col-lg-2 text-right text-lg-center">[Pencil]</div>
            <div class="col-6 col-lg-10 text-left">
              <div class="RobotoFont">Author</div>
              <div class="RobotoFont">{{ getBookInfo().author }}</div>
            </div>
          </div>
          <div class="row py-2 RobotoFont">
            <div class="col-6 col-lg-2 text-right text-lg-center">[Paint]</div>
            <div class="col-6 col-lg-10 text-left">
              <div class="RobotoFont">Art</div>
              <div class="RobotoFont">{{ getBookInfo().illustrator }}</div>
            </div>
          </div>
          <div class="row py-2 RobotoFont">
            <div class="col-6 col-lg-2 text-right text-lg-center">[Book]</div>
            <div class="col-6 col-lg-10 text-left">
              <div class="RobotoFont">Length</div>
              <div class="RobotoFont">{{ getBookInfo().totalPages }} pages</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
-->

<script>
import MainNavBar from "@/molecules/MainNavBar.vue";
import ScoreBar from "../atoms/ScoreBar.vue";
import LoadBar from "../atoms/LoadBar.vue";

export default {
  components: { MainNavBar, ScoreBar, LoadBar },
  data() {
    return { userName: "hello" };
  },
  methods: {
    getBookInfo() {
      if (this.$store.state.BookID) {
        return this.$store.state.BookArray[this.$store.state.BookID - 1][0];
      }
      return {
        title: ["No Book Selected"],
        author: "N/A",
        illustrator: "N/A",
        totalPages: "N/A",
      };
    },
    HandleLetsGo() {
      this.$store
        .dispatch("setUserName", { id: 0, name: this.userName })
        .then(() => {
          this.$router.push(`/book/${this.$store.state.BookID}/1`);
        });
    },
  },
};
</script>

<style scoped>
.DetailsTopPadding {
  padding-top: 8vh;
}
.JoinTextStyling {
  font-size: min(7vh, 10vw);
  padding-bottom: 3vh;
}
.JoinInputStyle {
  width: 20rem;
  max-width: 70vw;
  border-color: black;
  border-style: solid;
  border-width: 1px;
  border-radius: 10px;
  padding-left: 2vh;
}
.JoinButtonStyle {
  font-weight: 700;
  background-color: #96c5c2;
  border: none;
  cursor: pointer;
  padding-top: 4vh;
  min-height: 8vh;
}
.JoinButtonStyle:hover {
  color: red;
}
.RobotoFont {
  font-family: "Roboto", serif;
}

.BookBackGroundStyle {
  height: 100vh;
  width: 100vw;
  background-color: #96c5c2;
}

.TitleQuestion {
  margin-top: 6.8vh;
  font-size: 4vh;
  line-height: 100;
}

.makeBorder {
  border: solid;
  border-color: black;
  border-width: 3px;
  box-sizing: border-box;
}

#test {
  height: 100%;
}
#b1 {
  height: 400px;
  width: 100vw;
  background-color: #96c5c2;
  position: fixed;
  padding: 0;
  margin: 0;
}

.hasBorder {
  border-width: 10px;
  border: none;
  border-color: greenyellow;
}
#time {
  border-width: 10px;
  border: solid;
  border-color: coral;

  height: 100%;
  width: auto;
}
.footer {
  height: 10%;
}

@media (max-height: 800px) {
  .footer {
    height: 70px;
  }
}
</style>
