<template>
  <div class="container-fluid bg-light backgroundPadding">
    <div class="navBarColor navBarHeight row text-center">
      <div class="col-2 p-0 m-0">
        <router-link to="/">
          <img class="menuIconSize" alt="" src="../assets/Images/MenuButton.png"/>
        </router-link>
      </div>
      <input class="col-4 col-md-2 inputSize" type="text"
             placeholder="Search..." v-model="WordFilter"/>
      <div class="col-6 col-md-4">
        <img class="WonderLogoStyle" alt="" src="../assets/Images/WonderStories_Logo_BlackAlt.png"/>
      </div>
      <div class="col-md-4 d-none d-md-block">
        <div>GradeFilter: {{GradeFilter}}</div>
        <div>WordFilter: {{WordFilter}}</div>
      </div>
    </div>
    <div v-for="Book in WordFilteredBooks" :key="Book"
         class="d-inline-flex m-md-3 m-1">
      <div class="cardSize" @click="BookSelected(Book)">
        <img alt="" class="w-100" :src="Book.bookCoverImageUrl"/>
        <info-pill :value="0" 
        :hasStars="true"
        :showProgressBar="false"
        :numberOfPages="Book.totalPages" />
      </div>
    </div>
  </div>
</template>

<script>
import InfoPill from "@/components/ux/InfoPill.vue";

export default {
  data() {
    const { GradeFilter } = this.$store.state;
    const WordFilter = '';
    const GradeFilteredBooks = [];
    const WordFilteredBooks = [];
    return {
      GradeFilter, WordFilter, GradeFilteredBooks, WordFilteredBooks,
    };
  },
  created() {
    this.setGradeFilteredBooks();
  },
  beforeUpdate() {
    this.WordFilteredBooks = this.GradeFilteredBooks;
  },
  
  components: { InfoPill },
  methods: {
    setGradeFilteredBooks() {
    this.GradeFilteredBooks = this.$store.state.BookArray
    .filter((book) => { 
      let gradeBookOrder = this.$store.state.GradeBookOrder[this.$store.state.GradeFilter];
      if(gradeBookOrder) {
          return gradeBookOrder.includes(parseInt(book.bookId));
      } else {
        return true;
      }
    });
    
    this.WordFilteredBooks = this.GradeFilteredBooks;
    },
    async BookSelected(bookListItem) {
      console.log("selected with book :", bookListItem);
      let bookId = parseInt(bookListItem.bookId);
      localStorage.removeItem('HighestPage');
      this.$store.dispatch('setBookID', bookId);
      this.$store.dispatch('setBookPage', 1);
      this.$store.dispatch('ClearScores');
      await this.$store.dispatch('fetchBookData', bookId).then(() => { 
        this.$store.dispatch('setBookItem', bookListItem);
        this.$router.push(`/book/${bookId}/1`); 
        });
    },
  },
  async mounted() {
    if(this.$store.state.BookArray.length == 0) {
        await this.$store.dispatch('setBookList').then(() => this.setGradeFilteredBooks());
    }
  },
  loaded() {
    console.log('book images done loaded, hide load screen!');
  }
};
</script>

<style scope>

.backgroundPadding {
  min-height: 100vh;
  min-width: 100vw;
}
.cardSize {
  width: 20vw;
  max-width: 20vh;
  height: 38vw;
  max-height: 38vh;
}
.menuIconSize {
  height: 5vh;
  margin-top: 1.5vh;
  width: auto;
}
.cardSize:hover {
  cursor: pointer;
  transform: scale(1.1);
}
.navBarColor {
  background-color: #3aaaa3;
}
.navBarHeight {
  height: 8vh;
}
.WonderLogoStyle {
  margin-top: 2vh;
  height: auto;
  width: 18vh;
}
.inputSize {
  height: 5vh;
  margin-top: 1.5vh;
}
.ScoreBarAlignment {
  margin-top: 2vh;
  margin-left: 10%;
  margin-right: 10%;
}
</style>
