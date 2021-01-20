<template>
  <div class="backgroundPadding">
    <div class="container BackGroundColor w-100">
      <div class="navBarColor navBarHeight row text-center">
        <div class="col-4">
            <img class="iconSize hoverHand" alt="" src="../assets/Images/restart.png"
                 @click="this.ViewRestartModal=true"/>
        </div>
        <div class="col-4">
            <div class="progressBarStyle" :style="{background:
                 // eslint-disable-next-line max-len
                 `linear-gradient(to right, #8f9ad8 0%, #8f9ad8 ${this.PagePercent}%, #3aaaa3 ${this.PagePercent}%, #3aaaa3 100%)`}">
              Page {{page}}
            </div>
        </div>
        <div class="col-4">
          <router-link to="/books">
            <img class="iconSize" alt="" src="../assets/Images/home.png"/>
          </router-link>
        </div>
      </div>
      <div v-if="this.ViewRestartModal" :key=page>
        <RestartModal :book-number="id" @close-modal="this.ViewRestartModal = false"/>
      </div>
      <div v-if="this.GetPageData.type=='cover'" :key=page class="pageContainer">
        <PageCover :book-number="id"/>
      </div>
      <div v-else-if="this.GetPageData.type=='chapterTitle'" :key=page class="pageContainer">
        <PageChapter :chapter-number="this.GetPageData.chapterNumber"
                     :page-text="this.GetPageData.text"/>
      </div>
      <div v-else-if="this.GetPageData.type=='read'" :key=page class="pageContainer">
        <PageRead :data="this.GetPageData.pageParts" :book-number="id"/>
      </div>
      <div v-else-if="this.GetPageData.type=='questiontitle'"
           :key=page class="pageContainer">
        <PageQuestionTitle :data="this.GetPageData.pageParts"/>
      </div>
      <div v-else-if="this.GetPageData.type=='question'" :key=page class="pageContainer">
        <PageQuestion :data="this.GetPageData.pageParts" :book-number="id"/>
      </div>
      <div v-else-if="this.GetPageData.type=='choice'" :key=page class="pageContainer">
        <PageChoice :data="this.GetPageData.pageParts"/>
      </div>
      <div v-else-if="this.GetPageData.type=='end'" :key=page class="pageContainer">
        <PageEnd/>
      </div>
      <div v-else :key=page class="pageContainer">
        <p>New Page Type Is</p>
        <p v-if="this.GetPageData.type">{{this.GetPageData.type}}</p>
      </div>
      <div class="footerHeight row text-center">
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
import PageRead from '@/components/PageRead.vue';
import PageChapter from '@/components/PageChapter.vue';
import PageCover from '@/components/PageCover.vue';
import PageEnd from '@/components/PageEnd.vue';
import PageChoice from '@/components/PageChoice.vue';
import PageQuestionTitle from '@/components/PageQuestionTitle.vue';
import PageQuestion from '@/components/PageQuestion.vue';
import RestartModal from '@/components/RestartModal.vue';

export default {
  components: {
    PageQuestionTitle,
    PageChapter,
    PageRead,
    PageCover,
    PageEnd,
    PageChoice,
    PageQuestion,
    RestartModal,
  },
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
    const ViewRestartModal = false;
    return { BookObject, TotalPages, ViewRestartModal };
  },
  computed: {
    GetPageData() {
      console.log('Page data is =', this.BookObject.pages[+this.page - 1]);
      return this.BookObject.pages[+this.page - 1];
    },
    PagePercent() {
      const percentage = (this.page / this.TotalPages) * 100;
      return percentage;
    },
  },
  created() {
    this.BookObject = this.$store.state.BookArray[this.id - 1];
    this.TotalPages = this.BookObject.totalPages;
  },
};
</script>

<style scoped>
.backgroundPadding {
  height: 100vh;
  width: 100vw;
  background-color: grey;
}
.iconSize {
  height: 5vh;
  margin-top: 1.5vh;
  width: auto;
}
.pageContainer {
  position: relative;
  text-align: center;
  height: 84vh;
  padding-top: 1vh;
  padding-bottom: 1vh;
}
.navBarColor {
  background-color: #3aaaa3;
}
.navBarHeight {
  height: 8vh;
}
.footerHeight {
  height: 8vh;
}
.progressBarStyle {
  height: 4vh;
  font-size: 2vh;
  font-family: "Roboto";
  padding-top: 0.2vh;
  width: auto;
  margin-top: 2vh;
  color: white;
  border-style: solid;
  border-color: white;
  border-radius: 15px;
}
.BackGroundColor {
  background-color: #96c5c2;
}
.hoverHand:hover {
  cursor: pointer;
}
</style>
