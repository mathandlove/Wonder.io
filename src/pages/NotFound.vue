<template>
  <div class="not-found">
    <h1>Page Not Found</h1>
    <p>Sorry, the page you're looking for doesn't exist.</p>
    <router-link to="/">Go back home</router-link>
  </div>
</template>

<script>
export default {
  name: 'NotFound',
  mounted() {
    document.title = 'Page Not Found | Wonder.io';
  },
};
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  gap: 16px;
}
</style>
