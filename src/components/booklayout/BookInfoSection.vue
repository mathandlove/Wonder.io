<template>
  <section v-if="metadata" class="book-info-section" aria-label="About this story">
    <div class="book-info-inner">
      <h1 class="book-info-title">{{ metadata.title }}</h1>
      <p class="book-info-description">{{ metadata.description }}</p>

      <div class="book-info-details">
        <div class="book-info-detail" v-if="metadata.author">
          <span class="detail-label">Written by</span>
          <span class="detail-value">{{ metadata.author }}</span>
        </div>
        <div class="book-info-detail" v-if="metadata.illustrator">
          <span class="detail-label">Illustrated by</span>
          <span class="detail-value">{{ metadata.illustrator }}</span>
        </div>
        <div class="book-info-detail" v-if="metadata.genre">
          <span class="detail-label">Genre</span>
          <span class="detail-value">{{ metadata.genre }}</span>
        </div>
        <div class="book-info-detail" v-if="metadata.gradeLevel">
          <span class="detail-label">Grade Level</span>
          <span class="detail-value">{{ metadata.gradeLevel }}</span>
        </div>
        <div class="book-info-detail" v-if="metadata.ageRange">
          <span class="detail-label">Ages</span>
          <span class="detail-value">{{ metadata.ageRange }}</span>
        </div>
        <div class="book-info-detail" v-if="metadata.wordCount">
          <span class="detail-label">Reading Time</span>
          <span class="detail-value">~{{ readingTime }} min</span>
        </div>
      </div>

      <div class="book-info-related" v-if="relatedBooks.length > 0">
        <h2 class="related-heading">More {{ metadata.genre }} Stories</h2>
        <div class="related-grid">
          <router-link
            v-for="book in relatedBooks"
            :key="book.id"
            :to="`/book/${book.id}/1`"
            class="related-book"
          >
            <img
              :src="book.coverImage"
              :alt="`${book.title} - Free interactive story`"
              class="related-cover"
              loading="lazy"
            />
            <span class="related-title">{{ book.title }}</span>
            <span class="related-meta">{{ book.gradeLevel }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import bookMetadata from "@/assets/book-seo-metadata.json";

export default {
  props: {
    bookId: {
      type: [String, Number],
      required: true,
    },
  },
  computed: {
    metadata() {
      return bookMetadata[String(this.bookId)] || null;
    },
    readingTime() {
      if (!this.metadata) return 5;
      if (this.metadata.readingTime) return parseInt(this.metadata.readingTime);
      if (!this.metadata.wordCount) return 5;
      return Math.max(3, Math.ceil(this.metadata.wordCount / 120));
    },
    relatedBooks() {
      if (!this.metadata) return [];
      const genre = this.metadata.genre;
      const gradeLevel = this.metadata.gradeLevel;
      const currentId = String(this.bookId);

      return Object.values(bookMetadata)
        .filter(
          (b) =>
            b.id !== currentId &&
            (b.genre === genre || b.gradeLevel === gradeLevel)
        )
        .slice(0, 4);
    },
  },
};
</script>

<style scoped>
.book-info-section {
  background: rgba(255, 255, 255, 0.95);
  border-top: 3px solid #3aaaa3;
  padding: 32px 24px;
  max-width: 800px;
  margin: 0 auto;
  flex-shrink: 0;
}

.book-info-inner {
  max-width: 680px;
  margin: 0 auto;
}

.book-info-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 12px 0;
}

.book-info-description {
  font-size: 1rem;
  line-height: 1.6;
  color: #555;
  margin: 0 0 24px 0;
}

.book-info-details {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 32px;
}

.book-info-detail {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.detail-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #999;
  margin-bottom: 2px;
}

.detail-value {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
}

.related-heading {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.related-book {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s;
}

.related-book:hover {
  transform: scale(1.03);
}

.related-cover {
  width: 100%;
  max-width: 120px;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  margin-bottom: 8px;
}

.related-title {
  font-size: 0.8rem;
  font-weight: 500;
  text-align: center;
  color: #333;
  line-height: 1.3;
}

.related-meta {
  font-size: 0.7rem;
  color: #999;
  margin-top: 2px;
}

@media (max-width: 600px) {
  .book-info-section {
    padding: 24px 16px;
  }

  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .book-info-details {
    gap: 12px;
  }

  .book-info-detail {
    min-width: 100px;
  }
}
</style>
