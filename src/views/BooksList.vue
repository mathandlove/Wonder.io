<template>
  <div id="nav">
    <router-link to="/">Home</router-link> |
    <router-link to="/books">Books</router-link>
  </div>
  <div class="Books">
    <h1>This is the Book Filtered Page</h1>
    <h3>Books to be shown are: {{FilterValue}}</h3>
  </div>
</template>

<script>
export default {
  data() {
    const FilterValue = this.$store.state.BookFilter;
    return { FilterValue };
  },
};
</script>

<style scope>
#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
