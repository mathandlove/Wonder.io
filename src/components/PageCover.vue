<template>
  <img alt="" class="h-100" :src="require(`../assets/Books/book${bookNumber}/images/cover.png`)"/>
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
    this.$emit('show-hand', true);
  },
};
</script>
