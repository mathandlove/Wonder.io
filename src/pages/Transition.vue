<template>
  <div class="TransitionBackGround">
    <div class="TransitionCenterAlign text-center">
      <div class="TransitionTextStyling">Transition Page</div>
      <button class="btn bg-success" @click="HandleClick">Book Selection</button>
      <LoadBar class="mt-4" timer-text="Loading Next Book" timer-length="5"
               @load-done="this.RouteAfterLoad"/>
    </div>
  </div>
</template>

<script>
import LoadBar from '../atoms/LoadBar.vue';

export default {
  components: { LoadBar },
  methods: {
    HandleClick() {
      this.$router.push('/books');
    },
    RouteAfterLoad() {
      console.log('Route after transition page');
    },
  },
};
</script>

<style scoped>
.TransitionBackGround {
  background-color: #96c5c2;
  height: 100vh;
  width: 100vw;
}
.TransitionCenterAlign {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%,-50%);
}
.TransitionTextStyling {
  font-size: min(7vh,10vw);
}
</style>
