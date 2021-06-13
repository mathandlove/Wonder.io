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
        <ScoreBar class="ScoreBarAlignment" :points="0"/>
      </div>
    </div>
  </div>
</template>

<script>
import ScoreBar from '@/atoms/ScoreBar.vue';

export default {
  components: { ScoreBar },
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
    this.GradeFilteredBooks = this.$store.state.BookArray
    .filter((book) => this.$store.state.GradeBookOrder[this.$store.state.GradeFilter].includes(parseInt(book.bookId))) ;
    
    this.WordFilteredBooks = this.GradeFilteredBooks;
  },
  beforeUpdate() {
    this.WordFilteredBooks = this.GradeFilteredBooks;
  },
  
  methods: {
    BookSelected(bookID) {
      localStorage.removeItem('HighestPage');
      this.$store.dispatch('setBookID', bookID);
      this.$store.dispatch('setBookPage', 1);
      this.$store.dispatch('ClearScores');
      this.$router.push('/join');
    },
  },
  mounted() {
    console.log("mounted!!");
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
  height: 32vw;
  max-height: 32vh;
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
