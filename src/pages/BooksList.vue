<template>
  <div class="bg-light">
    <div class="navBarColor navBarHeight row text-center">
      <div class="col-2 p-0 m-0">
        <router-link to="/">
          <img
            class="menuIconSize"
            alt=""
            src="../assets/Images/MenuButton.png"
          />
        </router-link>
      </div>
      <input
        class="col-4 col-md-2 inputSize"
        type="text"
        placeholder="Search..."
        v-model="WordFilter"
      />
      <div class="col-6 col-md-4">
        <img
          class="WonderLogoStyle"
          alt=""
          src="../assets/Images/WonderStories_Logo_BlackAlt.png"
        />
      </div>
      <div class="col-md-4 d-none d-md-block">
        <div>GradeFilter: {{ GradeFilter }}</div>
        <div>WordFilter: {{ WordFilter }}</div>
      </div>
    </div>
    <div class="bookCardContainer">
      <div v-for="Book in WordFilteredBooks" :key="Book">
        <div class="cardSize" @click="BookSelected(Book)">
          <img alt="" :src="Book.bookCoverImageUrl" />
          <info-pill
            :value="0"
            :hasStars="true"
            :showProgressBar="false"
            :numberOfPages="Book.totalPages"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import InfoPill from "@/components/ux/InfoPill.vue";
import { mapState } from "vuex";

export default {
  data() {
    const { GradeFilter, GradeFilteredBookItems, WordFilteredBooks } =
      this.$store.state;
    const WordFilter = "";
    return {
      GradeFilter,
      WordFilter,
      GradeFilteredBookItems,
      WordFilteredBooks,
    };
  },
  computed: {
    ...mapState({
      totalBooks: (state) => state.BookArray.length,
    }),
  },
  components: { InfoPill },
  methods: {
    filterBooks() {
      let gradeBookOrder =
        this.$store.state.GradeBookOrder[this.$store.state.GradeFilter];
      var filteredBooks = this.$store.state.BookArray.filter((book) => {
        if (gradeBookOrder) {
          return gradeBookOrder.includes(parseInt(book.bookId));
        } else {
          return true;
        }
      });
      this.GradeFilteredBooks = filteredBooks;
      this.WordFilteredBooks = filteredBooks;
    },
    async BookSelected(bookListItem) {
      console.log("selected with book :", bookListItem);
      let bookId = parseInt(bookListItem.bookId);
      localStorage.removeItem("HighestPage");
      this.$store.dispatch("setBookID", bookId);
      this.$store.dispatch("setBookPage", 1);
      this.$store.dispatch("ClearScores");
      this.$store.dispatch("setBookItem", bookListItem);
      this.$router.push(`/book/${bookId}/1`);
    },
  },
  async mounted() {
    console.log("totalBooks", JSON.stringify(this.totalBooks));
    if (this.totalBooks == 1) {
      await this.$store
        .dispatch("fetchGradeFilters")
        .then(this.$store.dispatch("setGradeFilter", "grade2"));
      await this.$store.dispatch("setBookList").then();
    } else {
      this.filterBooks();
    }
  },
  loaded() {
    this.setGradeFilteredBooks();
    console.log("book images done loaded, hide load screen!");
  },
};
</script>

<style scope>
.backgroundPadding {
  min-height: 100vh;
  min-width: 100vw;
}
.cardSize {
  width: 23vw;
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 8%;
  margin-bottom: 2vh;
}
.cardSize img {
  margin-bottom: 4%;
  width: 80%;
}
.menuIconSize {
  height: 5vh;
  margin-top: 1.5vh;
  width: auto;
}
.cardSize img:hover {
  cursor: pointer;
  transform: scale(1.01);
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
  background-color: white;
}
.ScoreBarAlignment {
  margin-top: 2vh;
  margin-left: 10%;
  margin-right: 10%;
}
.bookCardContainer {
  border: solid;
  display: grid;
  grid-template-columns: repeat(4, 23vw);
  justify-content: space-around;
  width: 100%;
}

body {
  overflow-x: hidden;
}

@media (max-width: 1400px) {
  .bookCardContainer {
    grid-template-columns: repeat(3, 30vw);
  }
  .cardSize {
    width: 30vw;
  }
}
@media (max-width: 750px) {
  .bookCardContainer {
    grid-template-columns: repeat(2, 48vw);
  }
  .cardSize {
    width: 48vw;
  }
}

@media (max-width: 450px) {
  .bookCardContainer {
    grid-template-columns: repeat(1, 90vw);
  }
  .cardSize {
    width: 90vw;
  }
}
</style>
