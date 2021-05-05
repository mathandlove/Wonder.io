<template>
  <img alt="" class="h-100 coverWidth"
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
.coverWidth {
  max-width: 45.8vh;
}
.illustrator {
  position: absolute;
  top: 95.7%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: min(2vh,3.6vw);
}
</style>
