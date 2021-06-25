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
  <router-link :to="linkToNextBook">
    <div class="nextBookContainer">
      <img alt="" :src="coverHREF" id="nextBook" />
      <button>START</button>
    </div>
  </router-link>
</template>
<script>
import InfoPill from "@/components/ux/InfoPill.vue";
import { mapGetters } from "vuex";
export default {
  components: {
    InfoPill,
  },
  methods: {
    setupNIV() {},
  },
  computed: {
    ...mapGetters(["playerScore", "coverHREF", "linkToNextBook"]),
    sScoreTitle() {
      if (this.scoreRank == 1) {
        return "First";
      } else {
        return "Fourth Place";
      }
    },
  },
  methods: {},
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