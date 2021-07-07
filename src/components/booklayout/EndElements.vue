 <template>
  <div
    class="
      finalScoreContainer
      scoreContainerLeft
      text-center
      d-flex
      flex-column
      align-items-center
      justify-content-center
    "
  >
    <info-pill :value="playerScore" :title="sScoreTitle"></info-pill>
  </div>

  <div class="nextBookContainer">
    <img
      alt=""
      :src="getNextBook.bookCoverImageUrl"
      id="nextBook"
      @click="BookSelected(getNextBook)"
    />
    <button @click="BookSelected(getNextBook)">START</button>
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
      console.log(bookListItem.bookId);
      this.$store.dispatch("setBookId", bookListItem.bookId);
      this.$store.dispatch("setBookItem", bookListItem);
      this.$store.dispatch("fetchBookData", bookListItem.bookId);
      this.$store.dispatch("setBookPage", 1);
      this.$store.dispatch("ClearScores");
      this.$store.dispatch("setNextBookItem", bookListItem.bookId + 1);
      this.$router.push(`/book/${bookListItem.bookId}/1`);
    },
  },
  computed: {
    ...mapGetters([
      "playerScore",
      "coverHREF",
      "nextBookId",
      "scoreRank",
      "getNextBook",
    ]),
    sScoreTitle() {
      if (this.scoreRank == 1) {
        return "First";
      } else {
        return "Fourth Place";
      }
    },
  },
};
</script>

<style scoped>
.finalScoreContainer {
  margin-top: 0;
  margin-bottom: 10px;
  margin-left: 8%;
  margin-right: 3%;
  padding: 0;
  position: absolute;
  left: 0;
  right: 0;
  top: -15%;
}

.nextBookContainer {
  position: absolute;
  right: -80%;
  top: 10%;
  height: 80%;
  width: 60%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

#nextBook {
  height: 50%;
  width: auto;
}

Button {
  font-family: "Roboto", serif;
  font-size: 0.8em;
  font-weight: bold;
  margin-top: 2em;
  background-color: white;
  padding-left: 2em;
  padding-right: 2em;
  border-radius: 200px;
  border: none;
}
Button:hover {
  background-color: #7da8a5;
}
</style>