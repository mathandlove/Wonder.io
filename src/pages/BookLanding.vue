<template>
  <div class="book-landing" v-if="metadata">
    <nav class="landing-nav">
      <router-link to="/" class="nav-logo">
        <img
          alt="Wonder.io - Free Interactive Stories for Kids"
          src="../assets/Images/WonderStories_Logo_BlackAlt.png"
          class="nav-logo-img"
        />
      </router-link>
      <router-link to="/books" class="nav-back">
        All Books
      </router-link>
    </nav>

    <main class="landing-content">
      <div class="landing-hero">
        <div class="hero-image">
          <img
            :src="metadata.largeCoverImage || metadata.coverImage"
            :alt="`${metadata.title} - Free interactive story cover`"
            class="cover-image"
          />
        </div>
        <div class="hero-info">
          <span class="grade-badge">{{ metadata.gradeLevel }}</span>
          <h1 class="book-title">{{ metadata.title }}</h1>
          <p class="book-description">{{ metadata.description }}</p>

          <div class="details-divider"></div>

          <div class="book-details">
            <div class="detail-item" v-if="metadata.author">
              <span class="detail-label">Written by</span>
              <span class="detail-value">{{ metadata.author }}</span>
            </div>
            <div class="detail-item" v-if="metadata.illustrator">
              <span class="detail-label">Illustrated by</span>
              <span class="detail-value">{{ metadata.illustrator }}</span>
            </div>
            <div class="detail-item" v-if="metadata.genre">
              <span class="detail-label">Genre</span>
              <span class="detail-value">{{ metadata.genre }}</span>
            </div>
            <div class="detail-item" v-if="metadata.ageRange">
              <span class="detail-label">Ages</span>
              <span class="detail-value">{{ metadata.ageRange }}</span>
            </div>
            <div class="detail-item" v-if="metadata.wordCount">
              <span class="detail-label">Reading Time</span>
              <span class="detail-value">~{{ readingTime }} min</span>
            </div>
          </div>

          <button class="start-reading-btn" @click="startReading">
            {{ hasProgress ? 'Continue Reading' : 'Start Reading' }}
          </button>
        </div>
      </div>

      <section class="related-section" v-if="relatedBooks.length > 0">
        <h2 class="related-heading">More {{ metadata.genre }} Stories</h2>
        <div class="related-grid">
          <router-link
            v-for="book in relatedBooks"
            :key="book.id"
            :to="`/book/${book.id}`"
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
      </section>
    </main>
  </div>
</template>

<script>
import bookMetadata from "@/assets/book-seo-metadata.json";
import { updateBookMetaTags } from "@/utils/seo.js";
import { mapGetters } from "vuex";

export default {
  props: {
    id: {
      type: [String, Number],
      required: true,
    },
  },
  computed: {
    ...mapGetters(["lastPageVisited", "totalBooks", "gradeFilter"]),
    metadata() {
      return bookMetadata[String(this.id)] || null;
    },
    readingTime() {
      if (!this.metadata || !this.metadata.wordCount) return 5;
      return Math.max(3, Math.ceil(this.metadata.wordCount / 120));
    },
    hasProgress() {
      const bookmark = localStorage.getItem("bookmarkDict");
      if (!bookmark) return false;
      try {
        const dict = JSON.parse(bookmark);
        return dict[String(this.id)] && dict[String(this.id)].page > 1;
      } catch {
        return false;
      }
    },
    savedPage() {
      const bookmark = localStorage.getItem("bookmarkDict");
      if (!bookmark) return 1;
      try {
        const dict = JSON.parse(bookmark);
        if (dict[String(this.id)] && dict[String(this.id)].page > 1) {
          return dict[String(this.id)].page;
        }
      } catch {
        // fall through
      }
      return 1;
    },
    relatedBooks() {
      if (!this.metadata) return [];
      const genre = this.metadata.genre;
      const gradeLevel = this.metadata.gradeLevel;
      const currentId = String(this.id);

      // Prioritize same-genre matches, then fill with same grade level
      const allOthers = Object.values(bookMetadata).filter(
        (b) => b.id !== currentId
      );
      const genreMatches = allOthers.filter((b) => b.genre === genre);
      const gradeMatches = allOthers.filter(
        (b) => b.genre !== genre && b.gradeLevel === gradeLevel
      );
      return [...genreMatches, ...gradeMatches].slice(0, 4);
    },
  },
  methods: {
    startReading() {
      const page = this.savedPage;
      this.$gtag.event("book_selected", {
        event_category: "Book",
        book_id: parseInt(this.id),
        event_label: "Book Selected",
      });
      this.$store.dispatch("setBookId", this.id);
      this.$store.dispatch("loadBookmark");
      this.$router.push(`/book/${this.id}/${page}`);
    },
  },
  async mounted() {
    updateBookMetaTags(this.id, 1);

    if (this.totalBooks <= 1) {
      await this.$store.dispatch("setBookList");
    }
    if (this.gradeFilter.length < 1) {
      await this.$store.dispatch("fetchGradeFilters");
    }
    this.$store.dispatch("setGradeFilter");
    this.$store.dispatch("filterBooks");
    this.$store.dispatch("loadScoreDict");
  },
};
</script>

<style scoped>
.book-landing {
  min-height: 100vh;
  background-color: #e8f0ed;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.landing-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background-color: #3aaaa3;
}

.nav-logo-img {
  height: 5vh;
  width: auto;
}

.nav-back {
  color: white;
  text-decoration: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-weight: 500;
  font-size: 0.95rem;
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  transition: background 0.2s;
}

.nav-back:hover {
  background: rgba(255, 255, 255, 0.15);
}

.landing-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

.landing-hero {
  display: flex;
  gap: 40px;
  align-items: flex-start;
  margin-bottom: 48px;
}

.hero-image {
  flex-shrink: 0;
}

.cover-image {
  width: 300px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.hero-info {
  flex: 1;
}

.grade-badge {
  display: inline-block;
  background-color: #3aaaa3;
  color: white;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 14px;
  margin-bottom: 12px;
  letter-spacing: 0.02em;
}

.book-title {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 2.4rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 16px 0;
  line-height: 1.15;
}

.book-description {
  font-size: 1.08rem;
  line-height: 1.7;
  color: #444;
  margin: 0 0 20px 0;
}

.details-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.book-details {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  min-width: 110px;
}

.detail-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #999;
  margin-bottom: 3px;
}

.detail-value {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
}

.start-reading-btn {
  display: inline-block;
  padding: 16px 56px;
  background-color: #3aaaa3;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  box-shadow: 0 4px 16px rgba(58, 170, 163, 0.35);
}

.start-reading-btn:hover {
  background-color: #2e9089;
  transform: scale(1.03);
}

.related-section {
  border-top: 2px solid rgba(58, 170, 163, 0.15);
  padding-top: 36px;
}

.related-heading {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 20px 0;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
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
  max-width: 150px;
  height: auto;
  border-radius: 6px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  margin-bottom: 10px;
}

.related-title {
  font-size: 0.85rem;
  font-weight: 500;
  text-align: center;
  color: #333;
  line-height: 1.3;
}

.related-meta {
  font-size: 0.75rem;
  color: #999;
  margin-top: 3px;
}

@media (max-width: 700px) {
  .landing-hero {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .cover-image {
    width: 240px;
  }

  .book-title {
    font-size: 1.8rem;
  }

  .book-details {
    justify-content: center;
  }

  .start-reading-btn {
    width: 100%;
    padding: 16px 24px;
  }

  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .landing-nav {
    padding: 12px 16px;
  }

  .landing-content {
    padding: 24px 16px 48px;
  }
}
</style>
