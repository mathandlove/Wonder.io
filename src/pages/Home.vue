<template>
  <div class="blueBackground">
    <div class="paddingTop"/>
    <div class="ChalkboardBackground text-center">
      <GradeSelector v-for="Grade in GradeArray" :key="Grade" :Grade="Grade"/>
      <div class="text-black textThickness">Choose your Reading Grade</div>
    </div>
  </div>
</template>

<script>
import GradeSelector from '@/molecules/GradeSelector.vue';
export default {
  components: {
    GradeSelector,
  },
  data() {
    const GradeArray = ['PreK', 'K', '1', '2', '3', '4', '5', '6'];
    return { GradeArray };
  },
};
</script>

<style scoped>
.blueBackground {
  width: 100%;
  height: 100vh;
  background: #9bcbc9;
}
.paddingTop {
  padding-top: 15vh;
}
.ChalkboardBackground {
  height: 85vh;
  overflow: hidden;
  margin-left: 5vw;
  margin-right: 5vw;
  padding-left: 5vw;
  padding-right: 5vw;
  padding-top: 7vw;
  background-image: url("../assets/Images/Chalkboard.png");
  background-size: 100%;
  background-repeat: no-repeat;
}
.textThickness {
  font-weight: 900;
  font-size: 4vw;
}
</style>
