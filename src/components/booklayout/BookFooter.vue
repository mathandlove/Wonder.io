<template>
  <div class="footer">
    <div class="col-6 d-flex align-items-center justify-content-start h-100">
      <div
        class="
          scoreContainer
          scoreContainerLeft
          text-center
          d-flex
          flex-column
          align-items-center
          justify-content-center
        "
      >
        <info-pill :value="99000" title="Score" hasStars="false"></info-pill>
      </div>
    </div>
    <div class="col-6 d-flex align-items-center justify-content-end j h-100">
      <div
        class="
          scoreContainer
          scoreContainerRight
          text-center
          d-flex
          flex-column
          align-items-center
          justify-content-center
        "
      >
        <info-pill :value="3" title="Pages"></info-pill>
      </div>
    </div>
  </div>
</template>
<script>
import InfoPill from "@/components/ux/InfoPill.vue";
export default {
  components: { InfoPill },
};
</script>
<style  scoped>
.footer {
  height: 10%;
  display: flex;
}

.scoreContainer {
  margin-top: 0;
  margin-bottom: 10px;
  margin-left: 8%;
  margin-right: 3%;
  padding: 0;
}

@media (max-height: 800px) {
  .footer {
    height: 70px;
  }
}

@media (min-aspect-ratio: 110/100) {
  .scoreContainerLeft {
    position: absolute;
    left: 15%;
    top: -120%;
  }
  .scoreContainerRight {
    position: absolute;
    right: 15%;
    top: -130%;
  }
}
</style>