 <template>
  <h1>Scoreboard</h1>
  <div class="gridHolder">
    <div class="rankGrid">
      <div>1</div>
      <div>2</div>
      <div>3</div>
      <div>4</div>
    </div>
    <div class="scoreGrid">
      <transition-group name="card">
        <user-score-card
          v-for="score in allScoreCards"
          :score="score.NewScore"
          :oldScore="score.OldScore"
          :userName="score.name"
          :wentUp="false"
          :isPlayer1="score.id == 0"
          :key="score.id"
        ></user-score-card>
      </transition-group>
    </div>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
import { mapActions } from "vuex";
import UserScoreCard from "@/components/ux/UserScoreCard.vue";

export default {
  components: {
    UserScoreCard,
  },
  computed: {
    ...mapGetters(["allScoreCards"]),
  },
  data() {
    return {};
  },

  mounted() {
<<<<<<< HEAD
    // this.$store.dispatch("setPageStyle", "question");
    // setTimeout(this.sortScore, 1200);
    this.$store.dispatch("updateScores");
=======
    setTimeout(this.sortScore, 1200);
>>>>>>> master
  },
  dismounted() {},

  methods: {
    sortScore() {
      this.$store.dispatch("updateScores");
    },
    scoreComplete() {
      this.$store.dispatch("scoreAnimationComplete");
    },
  },
};
</script>

<style scoped>
.card-move {
  transition: all 1s;
}

h1 {
  text-align: center;
  font-weight: 500;
  margin-top: 15%;
  font-size: 2em;
  margin-bottom: 15%;
}
.gridHolder {
  display: flex;
  padding-left: 2%;
}
.rankGrid {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(4, 20%);
  grid-column-gap: 3%;
  grid-row-gap: 20%;
  position: relative;
  align-items: center;
  width: 10%;
  margin-right: 5%;
  text-align: left;
  font-family: "Roboto", serif;
  font-size: 0.9em;
  margin: 0;
  z-index: 2;
}
.scoreGrid {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(4, 20%);
  grid-column-gap: 3%;
  grid-row-gap: 20%;
  position: relative;
  align-items: center;
  width: 90%;
}

.userName {
  text-align: left;
  font-weight: bold;
}
.scoreName {
  text-align: right;
  font-weight: bold;
}
</style>