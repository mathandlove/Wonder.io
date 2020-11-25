<template>
  <img alt="" class="h-100" :src="require(`../assets/Books/book${bookNumber}/images/cover.png`)"/>
</template>

<script>
export default {
  props: {
    bookNumber: {
      type: String,
      required: true,
    },
  },
};
</script>
