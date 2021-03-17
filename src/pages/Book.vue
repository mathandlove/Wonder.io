<template>
  <div class="backgroundPadding">
    <div class="container BackGroundColor w-100">
      <MainNavBar @show-modal="this.ViewRestartModal=true"/>
      <RestartModal v-if="this.ViewRestartModal" @close-modal="this.ViewRestartModal=false"/>
      <div :key=page class="pageContainer">
        <PageCover v-if="this.GetPageData.type==='cover'" @show-hand="ToggleHand"/>
        <PageChapter v-else-if="this.GetPageData.type==='chapterTitle'" @show-hand="ToggleHand"
                     :number="this.GetPageData.chapterNumber" :page-text="this.GetPageData.text"/>
        <PageRead v-else-if="this.GetPageData.type==='read'" @show-hand="ToggleHand"
                  :data="this.GetPageData.pageParts" />
        <PageQuestionTitle v-else-if="this.GetPageData.type==='questiontitle'"
                           :data="this.GetPageData.pageParts" @show-hand="ToggleHand"
                           :counter="this.QuestionCounter"/>
        <PageQuestion v-else-if="this.GetPageData.type==='question'" @show-hand="ToggleHand"
                      :data="this.GetPageData.pageParts" :counter="this.QuestionCounter"/>
        <PageChoice v-else-if="this.GetPageData.type==='choice'" :data="this.GetPageData.pageParts"
                    @chosen-page="AddChoice" @show-hand="ToggleHand"/>
        <PageEnd v-else-if="this.GetPageData.type==='end'" @show-hand="ToggleHand"/>
        <PageNoExist v-else @show-hand="ToggleHand"/>
      </div>
      <MainFooter :total-pages="this.TotalPages" :points="this.GetPointsData"/>
      <NavArrows @next-page="this.RouteNextPage(false)"
                 @prev-page="RoutePrevPage"/>
      <NavTearHand @next-page="this.RouteNextPage(true)" v-if="this.ShowHand"/>
    </div>
  </div>
</template>

<script>
import PageRead from '@/organisms/PageRead.vue';
import PageChapter from '@/organisms/PageChapter.vue';
import PageCover from '@/organisms/PageCover.vue';
import PageEnd from '@/organisms/PageEnd.vue';
import PageChoice from '@/organisms/PageChoice.vue';
import PageQuestionTitle from '@/organisms/PageQuestionTitle.vue';
import PageQuestion from '@/organisms/PageQuestion.vue';
import RestartModal from '@/molecules/RestartModal.vue';
import PageNoExist from '@/organisms/PageNoExist.vue';
import MainNavBar from '@/molecules/MainNavBar.vue';
import MainFooter from '@/molecules/MainFooter.vue';
import NavArrows from '@/atoms/NavArrows.vue';
import NavTearHand from '@/atoms/NavTearHand';

export default {
  components: {
    NavTearHand,
    NavArrows,
    MainFooter,
    PageQuestionTitle,
    PageChapter,
    PageRead,
    PageCover,
    PageEnd,
    PageChoice,
    PageQuestion,
    RestartModal,
    PageNoExist,
    MainNavBar,
  },
  data() {
    const BookObject = {};
    const TotalPages = 1;
    const ViewRestartModal = false;
    const ShowHand = false;
    const HighestPage = 1;
    const PageSkipArray = [];
    const QuestionCounter = 1;
    let page;
    let id;
    return {
      BookObject,
      TotalPages,
      ViewRestartModal,
      PageSkipArray,
      ShowHand,
      page,
      id,
      HighestPage,
      QuestionCounter,
    };
  },
  computed: {
    GetPageData() {
      const tempData = this.BookObject.pages[+this.page - 1];
      this.AdjustQuestionCounter(this.BookObject.pages.slice(0, +this.page - 1));
      if (tempData) { return (tempData); }
      return [{ type: null }];
    },
    GetPointsData() {
      return 0
    }
  },
  methods: {
    AdjustQuestionCounter(data) {
      let tempCounter = 1;
      data.forEach((item) => {
        if (item.type === 'question') { tempCounter += 1; }
      });
      this.QuestionCounter = tempCounter;
    },
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
      if (newHighestPage && tempPage > this.$store.state.HighestPage) {
        this.$store.dispatch('setHighestPage', tempPage);
      }
      this.$store.dispatch('setBookPage', tempPage);
      this.$router.push(`/book/${this.$store.state.BookID}/${tempPage}`);
    },
    RoutePrevPage() {
      let tempPage = this.page - 1;
      this.PageSkipArray.forEach((choice) => {
        if (tempPage > choice.StartPage && tempPage < choice.EndPage) {
          if (choice.SelectedPage && tempPage >= choice.SelectedPage) {
            tempPage = choice.SelectedPage;
          } else { tempPage = choice.StartPage; }
        }
      });
      this.$store.dispatch('setBookPage', tempPage);
      this.$router.push(`/book/${this.$store.state.BookID}/${tempPage}`);
    },
    ToggleHand(newValue) {
      this.ShowHand = newValue;
    },
  },
  created() {
    this.id = this.$route.params.id;
    this.page = this.$route.params.page;
    this.$store.dispatch('setBookPage', this.page);
    [this.BookObject] = this.$store.state.BookArray[this.id - 1];
    this.TotalPages = this.BookObject.totalPages;
    this.createPageSkipArray();
  },
  beforeUpdate() {
    this.page = this.$store.state.BookPage;
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
.pageContainer {
  position: relative;
  text-align: center;
  height: 80vh;
  padding-top: 1vh;
  padding-bottom: 1vh;
  z-index: 0;
}
.BackGroundColor {
  background-color: #96c5c2;
}
</style>
