<template>
  <img alt="" class="h-100"
       :src="require(`../assets/Books/book${this.$store.state.BookID}/images/cover.png`)"
  />
  <div class="illustrator">Illustrator: {{GetIllustrator}}</div>
</template>

<script>
export default {
  emits: ['ShowHand', 'show-hand'],
  computed: {
    GetIllustrator() {
      return this.$store.state.BookArray[this.$store.state.BookID - 1][0].illustrator;
    },
  },
  created() {
    this.$emit('show-hand', true);
  },
};
</script>
<style scoped>
.illustrator {
  position: absolute;
  top: 95.7%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2vh;
}
</style>
