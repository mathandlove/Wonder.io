<template>
  <div class="backgroundPadding">
    <div>
      <div class="navBarColor">
        <div>
          <router-link to="/">
            <img class="imageSize" alt="" src="../assets/Images/MenuButton.png"/>
          </router-link>
        </div>
        <input type="text" placeholder="Search..." v-model="WordFilter"/>
        <h3><strong>Wonder Stories</strong></h3>
        <div/>
      </div>
      <div>
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
