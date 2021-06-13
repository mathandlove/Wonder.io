
  <template>
  <MainNavBar @show-modal="this.ViewRestartModal = true" />
  <!-- <RestartModal -->
  <!-- v-if="this.ViewRestartModal" @close-modal="this.ViewRestartModal = false" /> -->
</template>

<script>
import MainNavBar from "@/molecules/MainNavBar.vue";
export default {
  components: { MainNavBar },
};
</script>