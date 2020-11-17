<template>
  <div class="backgroundPadding">
    <div class="container border border-dark BackGroundColor vh-100">
      <div class="navBarColor py-2 row text-center">
        <div class="col-4">
          <router-link :to="{name: 'Book', params: {id: id, page: 1}}">
            <img class="iconSize" alt="" src="../assets/Images/restart.png"/>
          </router-link>
        </div>
        <div class="col-4 p-2">
            <div class="progress-bar">Page: {{page}} of {{this.TotalPages}}</div>
        </div>
        <div class="col-4">
          <router-link to="/books">
            <img class="iconSize" alt="" src="../assets/Images/home.png"/>
          </router-link>
        </div>
      </div>
      <div v-if="this.GetPageData.type=='cover'" :key=page class="PageSize">
        <img alt="" class="imageSize" :src="require(`../assets/Books/book${id}/images/cover.png`)"/>
      </div>
      <div v-else-if="this.GetPageData.type=='chapterTitle'" :key=page class="PageSize">
        <img alt="" class="imageSize" src="../assets/Images/NotepadWithoutLines.png"/>
        <div class="textFraming">
          <h1 v-if="this.GetPageData.chapterNumber" class="pb-4">
            Chapter {{this.GetPageData.chapterNumber}}
          </h1>
          <h3 v-if="this.GetPageData.text">{{this.GetPageData.text}}</h3>
        </div>
      </div>
      <div v-else-if="this.GetPageData.type=='read'" :key=page class="PageSize">
        <img alt="" class="imageSize" src="../assets/Images/notepadWithLines.png"/>
        <div class="textFraming">
          <h4 v-if="this.GetPageData.text">{{this.GetPageData.text}}</h4>
        </div>
      </div>
      <div v-else-if="this.GetPageData.type.toLowerCase()=='questiontitle'"
           :key=page class="PageSize">
        <img alt="" class="imageSize" src="../assets/Images/NotepadWithoutLines.png"/>
        <div class="textFraming">
          <h1 class="pb-4">Question</h1>
          <h3 v-if="this.GetPageData.question">{{this.GetPageData.question}}</h3>
        </div>
      </div>
      <div v-else-if="this.GetPageData.type=='question'" :key=page class="PageSize">
        <img alt="" class="imageSize" src="../assets/Images/NotepadWithoutLines.png"/>
        <div class="textFraming">
          <h1 class="pb-4">Question</h1>
          <h3 v-if="this.GetPageData.question">{{this.GetPageData.question}}</h3>
          <img v-if="this.GetPageData.image" alt="" class="w-50"
               :src="require(`../assets/Books/book${id}/images/${this.GetPageData.image}.png`)"/>
          <p v-if="this.GetPageData.answerCoords">{{this.GetPageData.answerCoords}}</p>
        </div>
      </div>
      <div v-else-if="this.GetPageData.type=='choice'" :key=page class="PageSize">
        <p>Show Choice</p>
      </div>
      <div v-else-if="this.GetPageData.type=='end'" :key=page class="PageSize">
        <img alt="" class="imageSize" src="../assets/Images/notepadWithLines.png"/>
        <h1 class="textFraming"><u><i>THE END</i></u></h1>
      </div>
      <div v-else :key=page class="PageSize">
        <p>New Page Type Is</p>
        <p v-if="this.GetPageData.type">{{this.GetPageData.type}}</p>
      </div>
      <div class="py-2 row text-center">
        <div class="col-4">
          <router-link :to="{name: 'Book', params: {id: id, page: +page - 1}}" v-if="page!=1">
            <img class="iconSize" alt="" src="../assets/Images/computerBack.png"/>
          </router-link>
        </div>
        <div class="col-4">
          <img class="iconSize" alt="" src="../assets/Images/blackAudioOn.png"/>
        </div>
        <div class="col-4">
          <router-link :to="{name: 'Book', params: {id: id, page: +page + 1}}"
                       v-if="page!=this.TotalPages">
            <img class="iconSize" alt="" src="../assets/Images/nextButton.png"/>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  props: {
    id: {
      type: String,
      required: true,
    },
    page: {
      type: String,
      required: true,
    },
  },
  data() {
    const BookObject = {};
    const TotalPages = 1;
    return { BookObject, TotalPages };
  },
  computed: {
    GetPageData() { return this.BookObject.pageData[+this.page - 1]; },
  },
  created() {
    this.BookObject = this.$store.state.BookArray[this.id - 1];
    while (this.BookObject.pageData[this.TotalPages]) {
      this.TotalPages += 1;
    }
  },
};
</script>

<style scoped>
.backgroundPadding {
  min-height: 100vh;
  min-width: 100vw;
  background-color: grey;
}
@media (max-width: 767px) {
  .PageSize {
    position: relative;
    top: 40%;
    left: 50%;
    transform: translate(-50%,-50%);
    height: 80%;
    width: auto;
  }

}
@media (min-width: 768px) {
  .PageSize {
    position: relative;
    top: 40%;
    left: 50%;
    transform: translate(-50%,-50%);
    height: 80%;
    width: 50%;
  }
}
.iconSize {
  height: 3rem;
  width: auto;
}
.textFraming {
  padding-top: 25%;
  text-align: center;
  padding-left: 15%;
  padding-right: 15%;
}
.imageSize {
  z-index: -1;
  width: auto;
  height: 100%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%,-50%);
  padding: 2%;
}

.navBarColor {
  background-color: #3aaaa3;
}
.BackGroundColor {
  background-color: #96c5c2;
}
</style>
