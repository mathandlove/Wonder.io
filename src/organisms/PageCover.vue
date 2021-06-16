<template>
  <img alt="" class="h-100 coverWidth" :src="coverImage"
  />
  <div class="illustrator">Illustrator: {{illustrator}}</div>
</template>

<script>
import { mapState } from 'vuex';
export default {
  emits: ['ShowHand', 'show-hand'],
  computed: mapState({
    illustrator: state => state.BookData.illustrator,
    coverImage: state => state.SelectedBookItem.largeBookCoverImageUrl
  }),
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
