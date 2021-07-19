
  <template>
  <meta
    name="viewport"
    content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1,width=device-width, user-scalable=no"
  />

  <body
    class="BookBackGroundStyle noSelectText makeBorder d-flex flex-column"
    :style="dynamicBodyHeight"
  >
    <slot> </slot>
  </body>
</template>
<script>
export default {
  data() {
    return {
      dynamicBodyHeight: {
        height: "30px",
      },
    };
  },
  methods: {
    makeClientViewSize() {
      this.dynamicBodyHeight = window.screen.Height + "px";
    },
  },
  mounted() {
    window.addEventListener("resize", this.makeClientViewSize);
    this.makeClientViewSize();

    document.addEventListener("gesturestart", function (e) {
      e.preventDefault();
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = 0.99;
    });

    document.addEventListener("gesturechange", function (e) {
      e.preventDefault();
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = 0.99;
    });

    document.addEventListener("gestureend", function (e) {
      e.preventDefault();
      // special hack to prevent zoom-to-tabs gesture in safari
      document.body.style.zoom = 0.99;
    });
  },
};
</script>


<style scoped>
html,
body {
  overflow-x: hidden;
  touch-action: manipulation;
}
body {
  position: relative;
}

.BookBackGroundStyle {
  height: 100%;
  width: 100vw;
  background-color: #96c5c2;
  position: fixed;
  padding: 0;
  margin: 0;
}
</style>