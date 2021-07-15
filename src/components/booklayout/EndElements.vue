 <template>
  <div class="columnContainers">
    <div class="nextBookContainer webBlock" />
    <div class="finalScoreContainer">
      <p class="scoreTitle">{{ sScoreTitle }}</p>
      <info-pill
        class="infoPillStyle"
        :value="playerScore"
        :rank="scoreRank"
      ></info-pill>
      <img :src="coverHREF" class="endCover" />
    </div>
    <div class="nextBookContainer">
      <div class="nextBookHolder">
        <img
          alt=""
          :src="getNextBook.bookCoverImageUrl"
          id="nextBook"
          @click="BookSelected(getNextBook)"
        />
        <button class="ScoreBarStyle" @click="BookSelected(getNextBook)">
          Next Book
        </button>
      </div>
    </div>
  </div>
</template>
<script>
import InfoPill from "@/components/ux/InfoPill.vue";
import { mapGetters } from "vuex";
export default {
  components: {
    InfoPill,
  },
  props: ["pageNum"],
  methods: {
    BookSelected(bookListItem) {
      console.log("going to via next click: " + bookListItem.bookId);
      this.$store.dispatch("resetWebHistory");
      //We need to reset the book to the beginning at the end once something is clicked.

      this.$store.dispatch("setBookId", bookListItem.bookId);
      this.$store.dispatch("setBookItem", bookListItem);
      this.$store.dispatch("fetchBookData", bookListItem.bookId).then(() => {
        this.$store.dispatch("setBookPage", 1);
        this.$store.dispatch("setNextBookItem");
        this.$store.dispatch("loadBookmark");
        this.$store.dispatch("saveQuestionsToBookmark");
        this.$store.dispatch("setPageType");
        this.$router.push(`/book/${bookListItem.bookId}/1`);
      });
    },
  },
  computed: {
    ...mapGetters([
      "playerScore",
      "coverHREF",
      "nextBookId",
      "scoreRank",
      "getNextBook",
      "coverHREF",
    ]),
    sScoreTitle() {
      if (this.scoreRank == 1) {
        return "1st Place";
      } else {
        return "Fourth Place";
      }
    },
  },
};
</script>

<style scoped>
.columnContainers {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  padding: 0;
  margin: 0;
  height: 80%;
  width: 100%;
  position: relative;
}
.scoreTitle {
  font-weight: bold;
  font-size: 6vh;
  font-weight: bold;
  font-family: "Coopforged";
  margin: 0;
}
.finalScoreContainer {
  width: 500px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.endCover {
  height: 70%;
  object-fit: contain;
  margin-top: 4vh;
  margin-bottom: 4vh;
}

button {
  margin: 0;
  padding: 0;
}
.ScoreBarStyle {
  font-family: "Roboto", serif;
  font-size: 0.8 em;
  width: 150px;
  height: 50px;
  color: black;
  border-style: solid;
  border-color: black;
  border-radius: 200px;
  box-shadow: 3px 3px black;
  padding: 0;
}

#nextBook {
  height: 40%;

  object-fit: contain;
}

.nextBookContainer {
  height: 100%;
  padding-left: 100px;
  flex-grow: 1;

  position: relative;
  display: flex;
  flex-direction: column;
  align-items: start;
  justify-content: center;
}

.nextBookHolder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

Button {
  font-family: "Roboto", serif;
  font-size: 1em;
  font-weight: bold;
  margin-top: 2em;
  background-color: white;
  padding-left: 2em;
  padding-right: 2em;
  border-radius: 200px;
  border: none;
}
.nextBookHolder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}
Button:hover {
  background-color: #7da8a5;
}

@media (max-height: 753px) {
  .finalScoreContainer {
    width: 300px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
}

@media (max-aspect-ratio: 1252/872) {
  .nextBookContainer {
    padding-left: 00px;
    margin-right: 60px;
    margin-left: 60px;
    align-items: center;
  }
}

@media (max-aspect-ratio: 686/912) {
  .finalScoreContainer {
    width: 60%;

    margin: 3%;
  }

  .endCover {
    width: 100%;
    height: auto;
  }

  #nextBook {
    width: 100%;
    height: auto;

    object-fit: contain;
  }
  .scoreTitle {
    font-size: 30px;
  }

  .nextBookContainer {
    width: 40%;
    padding-left: 5%;
    padding-right: 5%;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: start;
    justify-content: center;

    margin: 0;
  }
  .nextBookHolder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
  .ScoreBarStyle {
    width: 100px;
    height: 35px;
  }
  .webBlock {
    display: none;
  }
}
</style>
