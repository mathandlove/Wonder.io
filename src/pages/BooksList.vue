<template>
  <div class="noSelectText">
    <div class="navBarColor navBarHeight row text-center">
      <div class="p-0 m-0">
        <router-link to="/">
          <img class="menuIconSize" alt="" src="../assets/Images/home.png" />
        </router-link>
      </div>
      <input
        class="col-4 col-md-2 inputSize"
        type="text"
        placeholder="Search..."
        v-model="WordFilter"
        v-if="false"
      />
      <div class="wonderLogo">
        <img
          class="WonderLogoStyle"
          alt=""
          src="../assets/Images/WonderStories_Logo_BlackAlt.png"
        />
      </div>
      <div v-if="false" class="col-md-4 d-none d-md-block">
        <div>GradeFilter: {{ GradeFilter }}</div>
        <div>WordFilter: {{ WordFilter }}</div>
      </div>
    </div>
    <div class="bookCardContainer">
      <div v-for="Book in booksToDisplay" :key="Book">
        <div class="cardSize" @click="BookSelected(Book)">
          <base-spinner class="spinner" v-show="!Book.isLoaded" />
          <img
            v-show="Book.isLoaded"
            alt=""
            :src="Book.bookCoverImageUrl"
            @load="bookLoaded(Book)"
          />
          <info-pill
            :value="bookScore(Book.bookId)"
            :hasStars="true"
            :showProgressBar="false"
            :rank="
              Book.bookId in bookScoresDict ? bookScoresDict[Book.bookId][1] : 0
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import InfoPill from "@/components/ux/InfoPill.vue";
import BaseSpinner from "@/components/ux/BaseSpinner.vue";

import { mapGetters } from "vuex";
import TheBackground from "../components/ux/TheBackground.vue";

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
      BaseSpinner,
      TheBackground,
    };
  },
  computed: {
    ...mapGetters([
      "booksToDisplay",
      "bookScoresDict",
      "lastPageVisited",
      "gradeFilter",
      "totalBooks",
    ]),
  },

  components: { InfoPill, BaseSpinner, TheBackground },
  methods: {
    preloadImage: function (url) {
      let img = new Image();
      img.src = url;
    },
    bookScore(bookNum) {
      if (bookNum in this.bookScoresDict)
        return this.bookScoresDict[bookNum][0];
      else return 0;
    },

    bookLoaded(book) {
      book.isLoaded = true;
      this.$store.dispatch("increaseBooksToDisplay", 1);
    },
    initiateBookLoad() {
      this.$store.dispatch("increaseBooksToDisplay", 4);
    },

    BookSelected(bookListItem) {
      console.log("selected with book :", bookListItem.bookId);
      let bookId = parseInt(bookListItem.bookId);
      this.$store.dispatch("setBookId", bookListItem.bookId);
      this.$store.dispatch("loadBookmark");
      this.$router.push(`/book/${bookId}/${this.lastPageVisited}`);
    },
  },
  async mounted() {
    if (this.totalBooks <= 1) {
      await this.$store.dispatch("setBookList");
    }
    if (this.gradeFilter.length < 1) {
      await this.$store.dispatch("fetchGradeFilters");
    }
    this.$store.dispatch("setGradeFilter");
    this.$store.dispatch("filterBooks");
    this.$store.dispatch("loadScoreDict");
    this.initiateBookLoad();

    this.preloadImage(require("@/assets/Images/NotepadWithoutLines.png"));
    this.preloadImage(require("@/assets/Images/notepadWithLines.png"));

    document.addEventListener("gesturestart", function (e) {
      e.preventDefault();
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = 1;
    });

    document.addEventListener("gesturechange", function (e) {
      e.preventDefault();
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = 1;
    });

    document.addEventListener("gestureend", function (e) {
      e.preventDefault();
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = 1;
    });
  },
  unmounted() {
    this.$store.dispatch("resetBooksToDisplay");
  },
  loaded() {},
};
</script>

<style scope>
.backgroundPadding {
  min-height: 100vh;
  min-width: 100vw;
}
.cardSize {
  width: 23vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  margin-top: 12%;
  padding-left: 3vw;
  padding-right: 3vw;
}
.cardSize img {
  margin-bottom: 4%;
  width: 300px;
  height: 487px;
  object-fit: contain;
}
.spinner {
  width: 300px;
  height: 487px;
}
.menuIconSize {
  height: 5vh;
  margin-top: 1.5vh;
  position: absolute;
  right: 5%;
  width: auto;
}
.wonderLogo {
  position: absolute;
  left: 8%;
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
  margin-top: 1vh;
  margin-left: 10%;
  margin-right: 10%;
}
.bookCardContainer {
  display: grid;
  grid-template-columns: repeat(4, 23vw);
  justify-items: center;
  align-items: center;
  justify-content: center;

  width: 100%;
  margin-bottom: 100px;
}

body {
}

.noSelectText {
  user-select: none;
  overscroll-behavior: none;
  overflow-x: hidden;
  width: 100%;
}

@media (max-width: 1400px) {
  .bookCardContainer {
    grid-template-columns: repeat(3, 300px);
  }
  .cardSize {
    width: 300px;
  }
  .cardSize img {
    width: 225px;
    height: 365px;
    object-fit: contain;
  }
  .spinner {
    width: 225px;
    height: 365px;
  }
}
@media (max-width: 830px) {
  .bookCardContainer {
    grid-template-columns: repeat(3, 200px);
  }
  .cardSize {
    width: 300px;
  }
  .cardSize img {
    width: 186px;
    height: 301px;
    object-fit: contain;
  }
  .spinner {
    width: 186px;
    height: 301px;
  }
}

@media (max-width: 700px) {
  .bookCardContainer {
    grid-template-columns: repeat(2, 48vw);
  }
  .cardSize {
    width: 40vw;
  }
}

@media (max-width: 450px) {
  .cardSize img {
    width: 135px;
    height: 219px;
    object-fit: contain;
  }
  .cardSize img {
    width: 135px;
    height: 219px;
    object-fit: contain;
  }
}
</style>
