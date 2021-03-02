<template>
  <div class="backgroundPadding">
    <div class="container border border-dark bg-light vh-100">
      <div class="navBarColor navBarHeight row text-center">
        <div class="col-2">
          <router-link to="/">
            <img class="iconSize" alt="" src="../assets/Images/MenuButton.png"/>
          </router-link>
        </div>
        <input class="col-4 col-md-2 inputSize" type="text"
               placeholder="Search..." v-model="WordFilter"/>
        <div class="col-6 col-md-4 WonderStyle"><strong>Wonder Stories</strong></div>
        <div class="col-md-4 d-none d-md-block">
          <div>GradeFilter: {{GradeFilter}}</div>
          <div>WordFilter: {{WordFilter}}</div>
        </div>
      </div>
      <router-link v-for="Book in WordFilteredBooks"
           :key="Book"
           :to="{name: 'Book', params: {id: Book, page: 1}}"
           @click="this.deleteCache"
           class="d-inline-flex cardSize m-md-3 m-1">
          <img alt="" class="w-100"
            :src="require(`../assets/Books/book${Book}/images/cover.png`)"/>
      </router-link>
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
      (book) => this.$store.state.BookArray[book - 1].title.toLowerCase().includes(this.WordFilter),
    );
  },
  methods: {
    deleteCache() {
      localStorage.removeItem('HighestPage');
    },
  },
};
</script>

<style scope>
.backgroundPadding {
  min-height: 100vh;
  min-width: 100vw;
  background-color: grey;
}
.cardSize {
  width: 20vw;
  max-width: 20vh;
  height: 32vw;
  max-height: 32vh;
}
.iconSize {
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
.WonderStyle {
  font-size: 3vh;
  padding-top: 2vh;
}
.inputSize {
  height: 5vh;
  margin-top: 1.5vh;
}
</style>
