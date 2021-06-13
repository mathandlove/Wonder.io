
  <template>
  <meta name="viewport" content="width=device-width, user-scalable=no" />
  <meta
    name="viewport"
    content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1"
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
.BookBackGroundStyle {
  height: 100%;
  width: 100vw;
  background-color: #96c5c2;
  position: fixed;
  padding: 0;
  margin: 0;
}
.noSelectText {
  user-select: none;
}

.makeBorder {
  border: none;
  border-color: greenyellow;
  border-width: 3px;
  box-sizing: border-box;
}
</style>