
  <template>
  <body class="noSelectText" ref="fullbody">
    <slot> </slot>
  </body>
</template>
<script>
import DisableBodyScroll from "body-scroll-lock";
export default {
  data() {
    return {};
  },
  components: {
    DisableBodyScroll,
  },
  methods: {
    ToggleFullScreen() {
      window.addEventListener("scroll", (e) => {
        e.preventDefault();
        window.scrollTo(0, 0);
      });

      document.getElementById("fullbody").ontouchend = (e) => {
        e.preventDefault();
        return false;
      };
    },
  },
  mounted() {
    this.ToggleFullScreen();
  },
};
</script>


<style scoped>
.BookBackGroundStyle {
  height: 100vh;
  width: 100vw;
  background-color: #96c5c2;
}
.noSelectText {
  user-select: none;
}
body {
  height: 100vh;
  width: 100vw;
  margin: 0;

  /* prevent overscroll bounce*/
  background-color: #96c5c2;
  overflow-y: clip;
  overflow: hidden;
  touch-action: none;
  top: -30px;
  -webkit-overflow-scrolling: touch;
  /* iOS velocity scrolling */
}

html {
  position: static;
  overflow-y: hidden;
  height: 100%;
  max-height: 100%;
}
</style>