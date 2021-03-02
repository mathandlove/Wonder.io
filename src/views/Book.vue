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
      <div v-if="this.ViewRestartModal">
        <RestartModal :book-number="id" @close-modal="this.ViewRestartModal = false"/>
      </div>
      <div v-if="this.GetPageData.type=='cover'" :key=page class="pageContainer">
        <PageCover :book-number="id" @show-hand="ToggleHand"/>
      </div>
      <div v-else-if="this.GetPageData.type=='chapterTitle'" :key=page class="pageContainer">
        <PageChapter :chapter-number="this.GetPageData.chapterNumber"
                     :page-text="this.GetPageData.text"
                     @show-hand="ToggleHand"/>
      </div>
      <div v-else-if="this.GetPageData.type=='read'" :key=page class="pageContainer">
        <PageRead :data="this.GetPageData.pageParts" :book-number="id"
                  @show-hand="ToggleHand"/>
      </div>
      <div v-else-if="this.GetPageData.type=='questiontitle'"
           :key=page class="pageContainer">
        <PageQuestionTitle :data="this.GetPageData.pageParts" @show-hand="ToggleHand"/>
      </div>
      <div v-else-if="this.GetPageData.type=='question'" :key=page class="pageContainer">
        <PageQuestion :data="this.GetPageData.pageParts" :book-number="id"
                      @show-hand="ToggleHand"/>
      </div>
      <div v-else-if="this.GetPageData.type=='choice'" :key=page class="pageContainer">
        <PageChoice :data="this.GetPageData.pageParts" :book-number="id" :book-page="page"
                    @chosen-page="AddChoice" @show-hand="ToggleHand"/>
      </div>
      <div v-else-if="this.GetPageData.type=='end'" :key=page class="pageContainer">
        <PageEnd @show-hand="ToggleHand"/>
      </div>
      <div v-else :key=page class="pageContainer">
        <PageNoExist :book-number="id" @show-hand="ToggleHand"/>
      </div>
      <div class="footerHeight row text-center">
        <div class="col-4">
          <img class="iconSize" alt="" src="../assets/Images/computerBack.png"
               v-if="page!=1" @click="RoutePrevPage"/>
        </div>
        <div class="col-4"></div>
        <div v-if="this.HighestPage > this.page" class="col-4">
          <img class="iconSize" alt="" src="../assets/Images/nextButton.png"
               @click="RouteNextPage(false)"/>
        </div>
        <div v-else class="col-4"></div>
      </div>
      <img class="iconHand" alt="" src="../assets/Images/TearHand.png"
           v-if="page<this.TotalPages && this.ShowHand"
           @click="RouteNextPage(true)"/>
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
import PageNoExist from '@/components/PageNoExist.vue';

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
    PageNoExist,
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
    const HighestPage = 1;
    const ViewRestartModal = false;
    const PageSkipArray = [];
    const ShowHand = false;
    return {
      BookObject, TotalPages, ViewRestartModal, PageSkipArray, HighestPage, ShowHand,
    };
  },
  computed: {
    GetPageData() {
      console.log('Page data is =', this.BookObject.pages[+this.page - 1]);
      const tempData = this.BookObject.pages[+this.page - 1];
      if (tempData) { return (tempData); }
      return [{ type: null }];
    },
    PagePercent() {
      return (this.page / this.TotalPages) * 100;
    },
  },
  methods: {
    createPageSkipArray() {
      this.BookObject.pages.forEach((page) => {
        if (page.type === 'choice') {
          const firstPage = page.pageNumber + 1;
          const totalOptions = page.pageParts[0].lineParts.length;
          const lastPage = firstPage + totalOptions;
          this.PageSkipArray.push({
            StartPage: firstPage,
            SelectedPage: null,
            EndPage: lastPage,
          });
        }
      });
    },
    AddChoice(pageChosen) {
      this.PageSkipArray.forEach((choice, index) => {
        if (pageChosen > choice.StartPage && pageChosen < choice.EndPage) {
          this.PageSkipArray[index].SelectedPage = pageChosen;
        }
      });
    },
    RouteNextPage(newHighestPage) {
      let tempPage = +this.page + 1;
      this.PageSkipArray.forEach((choice) => {
        if (tempPage > choice.StartPage && tempPage < choice.EndPage) {
          if (choice.SelectedPage && tempPage <= choice.SelectedPage) {
            tempPage = choice.SelectedPage;
          } else { tempPage = choice.EndPage; }
        }
      });
      if (newHighestPage) { this.$store.dispatch('setHighestPage', tempPage); }
      this.$router.push(`/book/${this.id}/${tempPage}`);
    },
    RoutePrevPage() {
      let tempPage = +this.page - 1;
      this.PageSkipArray.forEach((choice) => {
        if (tempPage > choice.StartPage && tempPage < choice.EndPage) {
          if (choice.SelectedPage && tempPage >= choice.SelectedPage) {
            tempPage = choice.SelectedPage;
          } else { tempPage = choice.StartPage; }
        }
      });
      this.$router.push(`/book/${this.id}/${tempPage}`);
    },
    ToggleHand(boolean) {
      this.ShowHand = boolean;
    },
  },
  created() {
    [this.BookObject] = this.$store.state.BookArray[this.id - 1];
    this.TotalPages = this.BookObject.totalPages;
    this.createPageSkipArray();
  },
  beforeUpdate() {
    this.HighestPage = this.$store.state.HighestPage;
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
.iconHand {
  position: absolute;
  top: 92.5%;
  left: 50%;
  transform: translate(-50%, -50%);
  height: 7vh;
  width: auto;
}
.pageContainer {
  position: relative;
  text-align: center;
  height: 84vh;
  padding-top: 1vh;
  padding-bottom: 1vh;
  z-index: 0;
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
