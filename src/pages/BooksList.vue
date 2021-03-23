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
    <div v-for="Book in WordFilteredBooks" :key="Book" @click="BookSelected(Book)"
         class="d-inline-flex cardSize m-md-3 m-1">
        <img alt="" class="w-100"
          :src="require(`../assets/Books/book${Book}/images/cover.png`)"/>
    </div>
  </div>
</template>

<script>
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
    this.GradeFilteredBooks = this.$store.state.GradeBookOrder[this.$store.state.GradeFilter];
    this.WordFilteredBooks = this.GradeFilteredBooks;
  },
  beforeUpdate() {
    this.WordFilteredBooks = this.GradeFilteredBooks.filter(
      (book) => this.$store.state.BookArray[book - 1][0].title[0].toLowerCase()
        .includes(this.WordFilter),
    );
  },
  methods: {
    BookSelected(bookID) {
      localStorage.removeItem('HighestPage');
      this.$store.dispatch('setBookID', bookID);
      this.$store.dispatch('setBookPage', 1);
      this.$router.push(`/book/${bookID}/1`);
    },
  },
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
</style>
