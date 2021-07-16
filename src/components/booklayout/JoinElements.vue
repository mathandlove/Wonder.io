 <template>
  <div class="h1c">Join Game</div>
  <div style="text-align: center">
    <input
      class="pillBoxLong"
      type="text"
      maxLength="15"
      placeholder="Player Name"
      v-model="inputPlayerName"
    />
    <button @click="savePlayerName">PLAY</button>
    <author-info-mobile />
  </div>
</template>
<script>
import AuthorInfoMobile from "@/components/booklayout/AuthorInfoMobile.vue";

export default {
  components: {
    AuthorInfoMobile,
  },
  data() {
    return {
      inputPlayerName: "",
    };
  },
  methods: {
    savePlayerName() {
      this.$store.dispatch("savePlayerName", this.inputPlayerName);
    },
  },
  mounted() {},
  dismounted() {},
};
</script>

<style scoped>
Button {
  font-family: "Roboto", serif;
  font-size: 0.8em;
  font-weight: bold;
  margin-top: 2em;
  background-color: #96c5c2;
  padding-left: 2em;
  padding-right: 2em;
  border-radius: 200px;
  border: none;
  outline: none;
}
Button:hover {
  background-color: #7da8a5;
}
button:focus {
  outline: none;
}
</style>