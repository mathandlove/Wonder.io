<template>
  <a
    href="https://experiment.wonder.io"
    class="announcement-band"
    @click="handleClick"
    role="banner"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="announcement-icon">✨</span>
    <span class="announcement-text">New AI Wonder Story</span>
    <span class="announcement-subtitle">Be the first to explore our newest story →</span>
  </a>
</template>

<script>
export default {
  name: 'NewStoryPinnedNote',
  methods: {
    handleClick() {
      this.trackEvent('new_story_announcement_clicked', {
        destination: 'experiment.wonder.io'
      });
    },

    trackEvent(eventName, params = {}) {
      if (this.$gtag) {
        this.$gtag.event(eventName, {
          event_category: 'Site Announcement',
          ...params
        });
      }
    }
  }
};
</script>

<style scoped>
.announcement-band {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px 24px;
  background: #f7f9f9;
  text-decoration: none;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.announcement-band:hover {
  background: #eff3f3;
}

.announcement-band:focus {
  outline: 2px solid #3aaaa3;
  outline-offset: -2px;
}

.announcement-icon {
  font-size: 16px;
  line-height: 1;
}

.announcement-text {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #1a202c;
  line-height: 1.4;
}

.announcement-subtitle {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  font-weight: 400;
  color: #4a5568;
  line-height: 1.4;
}

/* Mobile responsive */
@media (max-width: 700px) {
  .announcement-band {
    padding: 10px 16px;
    flex-wrap: wrap;
  }

  .announcement-text,
  .announcement-subtitle {
    font-size: 13px;
  }
}

@media (max-width: 450px) {
  .announcement-subtitle {
    font-size: 12px;
  }
}
</style>
