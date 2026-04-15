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
        <info-pill
          v-if="showScorePill"
          :value="playerScore"
          title="Score"
        ></info-pill>
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
        <info-pill
          v-if="showPagePill"
          :value="pageNumber"
          title="Page"
          :hasStars="false"
          :showProgressBar="true"
          :numberOfPages="totalNumberOfPages"
        ></info-pill>
      </div>
    </div>
  </div>
</template>
<script>
import InfoPill from "@/components/ux/InfoPill.vue";
import { mapGetters } from "vuex";
export default {
  components: { InfoPill },
  computed: {
    ...mapGetters([
      "pageNumber",
      "totalNumberOfPages",
      "playerScore",
      "showPagePill",
      "showScorePill",
    ]),
  },
};
</script>
<style  scoped>
.footer {
  position: relative;
  height: 100px;
  flex-shrink: 0;
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
    margin: 3%;
  }
}

@media (min-aspect-ratio: 76/61) {
  @media (min-height: 600px) {
    .scoreContainerLeft {
      position: absolute;
      left: 15%;
      top: -300%;
    }
    .scoreContainerRight {
      position: absolute;
      right: 15%;
      top: -300%;
    }
    .footer {
      height: 50px;
    }
  }
}
</style>