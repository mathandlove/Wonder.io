<template>
  <div class="homeBackground">
    <div>
      <GradeSelector v-for="Grade in GradeArray" :key=Grade.id :Grade="Grade"/>
    </div>
  </div>
</template>

<script>
import GradeSelector from '@/components/GradeSelector.vue';

export default {
  components: {
    GradeSelector,
  },
  data() {
    const GradeArray = [
      {
        id: 'PRE', top: 'PRE-', mid: 'K', color: 'pink',
      },
      {
        id: 'K', top: 'GRADE', mid: 'K', color: 'yellow',
      },
      {
        id: '1', top: 'GRADE', mid: '1', color: 'red',
      },
      {
        id: '2', top: 'GRADE', mid: '2', color: 'blue',
      },
      {
        id: '3', top: 'GRADE', mid: '3', color: 'green',
      },
      {
        id: '4', top: 'GRADE', mid: '4', color: 'purple',
      },
      {
        id: '5', top: 'GRADE', mid: '5', color: 'orange',
      },
      {
        id: '6', top: 'GRADE', mid: '6+', color: 'teal',
      },
      {
        id: 'ALL', top: 'ALL', mid: 'View', color: 'grey',
      },
    ];
    return {
      GradeArray,
    };
  },
};
</script>

<style scoped>
.homeBackground {
  min-height: 100vh;
  min-width: 100vw;
  background: linear-gradient(to left, rgba(7,27,82,1) 0%, rgba(0,128,128,1) 100%);
}
</style>
