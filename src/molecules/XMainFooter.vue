<template>
  <div
    class="footerHeight row text-center"
    :style="{ 'padding-top': this.$store.state.AspectRatio > 2 ? '4vh' : '0' }"
  >
    <div class="d-none d-lg-block col-lg-3" />
    <div class="col-4 col-lg-2">
      <div class="fontRoboto textSize">POINTS</div>
      <info-pill :value="this.$store.state.Scores[0].NewScore" />
    </div>
    <div class="col-4 col-lg-2"></div>
    <div class="col-4 col-lg-2">
      <div class="fontRoboto textSize">PAGE</div>
      <div
        class="progressBarStyle fontRoboto"
        :style="{
          background:
            // eslint-disable-next-line max-len
            `linear-gradient(to right, #8f9ad8 0%, #8f9ad8 ${this.PagePercent}%, #FFFFFF ${this.PagePercent}%, #FFFFFF 100%)`,
        }"
      >
        {{ BookPage }}
      </div>
    </div>
    <div class="d-none d-lg-block col-lg-3" />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import InfoPill from '@/components/ux/InfoPill.vue';

export default {
  components: { InfoPill },
  props: {
    totalPages: {
      type: Number,
      required: true,
    },
  },
  methods: {
  },
  computed: {
    PagePercent() {
        return (this.BookPage / this.totalPages) * 100;
      },
    ...mapState(['BookPage'])
  },
};
</script>

<style scoped>
.footerHeight {
  height: 10vh;
}
.fontRoboto {
  font-family: "Roboto", serif;
}
.textSize {
  font-size: 2vh;
}
.progressBarStyle {
  height: 4vh;
  font-size: 2vh;
  padding-top: 0.2vh;
  width: auto;
  color: black;
  border-style: solid;
  border-color: black;
  border-radius: 15px;
  box-shadow: 3px 3px black;
}
</style>
