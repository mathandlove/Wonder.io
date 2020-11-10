<template>
  <div class="backgroundPadding">
    <div class="container border border-dark bg-light">
      <div class="navBarColor py-2 row text-center">
        <div class="col-2">
          <router-link to="/">
            <img class="imageSize" alt="" src="../assets/Images/MenuButton.png"/>
          </router-link>
        </div>
        <input class="col-4 col-md-2" type="text" placeholder="Search..." v-model="WordFilter"/>
        <h3 class="col-6 col-md-4 pt-2"><strong>Wonder Stories</strong></h3>
        <div class="col-md-4"/>
      </div>
      <div class="text-center">
        <h1>This is the Books Page</h1>
        <h3>Grade Filter set to: {{GradeFilter}}</h3>
        <h3>Word Filter set to: {{WordFilter}}</h3>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    const { GradeFilter } = this.$store.state;
    const WordFilter = '';
    return { GradeFilter, WordFilter };
  },
};
</script>

<style scope>
.backgroundPadding {
  min-height: 100vh;
  min-width: 100vw;
  background-color: grey;
}
.imageSize {
  height: 3rem;
  width: auto;
}

.navBarColor {
  background-color: #19b7aa;
}

</style>
