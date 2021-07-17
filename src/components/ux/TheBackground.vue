
  <template>
  <meta
    name="viewport"
    content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1,width=device-width"
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
  },
};
</script>


<style scoped>
html,
body {
  overflow-x: hidden;
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