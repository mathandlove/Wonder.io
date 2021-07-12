<template>
  <div class="likeBackGround">
    <div class="likeCenterAlign">
      <div class="likeTextStyling">Did you like</div>
      <div class="likeTextStyling">this book?</div>
      <div class="likeBox bg-success" @click="LikeBookClick(true)"/>
      <div class="likeBox bg-danger" @click="LikeBookClick(false)"/>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    LikeBookClick(bool) {
      this.$router.push('/celebration');
    },
  },
};
</script>

<style scoped>
.likeBackGround {
  background-color: #96c5c2;
  height: 100vh;
  width: 100vw;
}
.likeCenterAlign {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%,-50%);
}
.likeTextStyling {
  font-size: min(7vh,10vw);
}
.likeBox {
  margin-left: auto;
  margin-right: auto;
  margin-bottom: min(4vh,7vw);
  width: min(20vh,36vw);
  height: min(20vh,36vw);
  border-style: solid;
}
.likeBox:hover {
  cursor: pointer;
  transform: scale(1.1);
  z-index: 1;
}
</style>
