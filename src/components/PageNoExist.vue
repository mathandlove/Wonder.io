<template>
  <img alt="" class="h-100" src="../assets/Images/notepadWithLines.png"/>
  <div class="centeredNoExist">
    <div class="fontSizeExist"><u><i>Page Doesn't Exist</i></u></div>
    <router-link :to="{name: 'Book', params: {id: this.bookNumber, page: 1}}"
                 class="btn btn-info buttonHeight">
      Return to Beginning
    </router-link>
  </div>
</template>

<script>
export default {
  emits: ['ShowHand', 'show-hand'],
  props: {
    bookNumber: {
      type: String,
      required: true,
    },
  },
  created() {
    this.$emit('show-hand', false);
  },
};
</script>

<style scoped>
.centeredNoExist {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.fontSizeExist {
  font-size: 5vh;
  margin-bottom: 3.5vh;
}
.buttonHeight {
  width: 15vh;
  padding-top: 1vh;
  font-size: 1.5vh;
}
</style>
