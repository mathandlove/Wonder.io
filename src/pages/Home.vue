<template>
  <div class="blueBackground text-center">
    <div :style="{'padding-top': this.$store.state.AspectRatio > 2 ? '20vh' : '10vh'}"/>
    <div :class="[this.$store.state.AspectRatio > 1 ? this.$store.state.AspectRatio > 2 ?
          'ChalkboardTall' : 'ChalkboardMid' : 'ChalkboardWide']" class="ChalkboardBasics">
      <GradeSelector v-for="Grade in GradeArray" :key="Grade" :Grade="Grade"/>
      <div class="text-black textThickness">Choose your Reading Grade</div>
    </div>
  </div>
</template>

<script>
import GradeSelector from '@/molecules/GradeSelector.vue';
import axios from 'axios';

const resource_uri = 'https://localhost:49155/book';
// const resource_uri = 'https://wonder-stories-api.web.app/book/';

export default {
  components: {
    GradeSelector,
  },
  data() {
    const GradeArray = ['gradePreK', 'gradeK', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6'];
    return { GradeArray };
  },
  async mounted() {
    await this.getApiBooks();
  },
  methods: {
    getApiBooks: async function() {
      try {
        await this.$store.dispatch('setBookList');
        await this.$store.dispatch('fetchGradeFilters');
      } catch {

      }
    }
  }
};
</script>

<style scoped>
.blueBackground {
  background-color: #96c5c2;
  height: 100vh;
  width: 100vw;
}
.ChalkboardBasics {
  margin-left: 5vw;
  margin-right: 5vw;
  background-size: 100%;
  background-repeat: no-repeat;
  overflow: hidden;
}
.ChalkboardWide {
  height: 90vh;
  padding-left: 8vw;
  padding-right: 8vw;
  padding-top: 5vw;
  background-image: url("../assets/Images/Chalkboard.png");
}
.ChalkboardMid {
  height: 90vh;
  padding-left: 5vw;
  padding-right: 5vw;
  padding-top: 15vh;
  background-image: url("../assets/Images/phoneBoard.png");
}
.ChalkboardTall {
  height: 80vh;
  padding-left: 5vw;
  padding-right: 5vw;
  padding-top: 10vh;
  background-image: url("../assets/Images/phoneBoard.png");
}
.textThickness {
  font-weight: 900;
  font-size: min(3vw,5vh);
}
</style>
