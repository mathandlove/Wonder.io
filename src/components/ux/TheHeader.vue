
  <template>
  <div class="container w-100">
    <MainNavBar @show-modal="this.ViewRestartModal = true" />
    <RestartModal
      v-if="this.ViewRestartModal"
      @close-modal="this.ViewRestartModal = false"
    />
  </div>
</template>

<script>
import MainNavBar from "@/molecules/MainNavBar.vue";
export default {
  components: { MainNavBar },
};
</script>