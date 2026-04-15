<template>
  <div class="landing-page">
    <!-- Navigation -->
    <nav class="landing-nav">
      <div class="nav-inner">
        <router-link to="/">
          <img
            class="landing-logo"
            alt="Wonder Stories - Free Interactive Books for Kids"
            src="../assets/Images/landing/wonderstories-logo.png"
          />
        </router-link>
        <div class="nav-links">
          <router-link to="/books" class="nav-link">Books</router-link>
          <a href="https://www.wonderstories.app/research" class="nav-link" target="_blank" rel="noopener">Research</a>
          <a href="https://www.wonderstories.app/about-us" class="nav-link" target="_blank" rel="noopener">About</a>
          <router-link to="/books" class="nav-cta-btn">Start Reading</router-link>
        </div>
      </div>
    </nav>

    <main>
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-content">
            <span class="free-badge">100% FREE</span>
            <h1 class="hero-h1">{{ title }}</h1>
            <p class="hero-subtitle">{{ subtitle }}</p>
            <router-link to="/books" class="cta-primary">Start Reading Now</router-link>
          </div>
          <div class="hero-image">
            <img
              src="../assets/Images/landing/app-example.png"
              alt="Wonder Stories interactive book example"
              class="hero-screenshot"
            />
          </div>
        </div>
      </section>

      <!-- Social Proof Bar -->
      <section class="proof-bar">
        <div class="proof-inner">
          <div class="proof-stat">
            <span class="proof-number">81+</span>
            <span class="proof-label">Free Books</span>
          </div>
          <div class="proof-stat">
            <span class="proof-number">4x</span>
            <span class="proof-label">Longer Reading</span>
          </div>
          <div class="proof-stat">
            <span class="proof-number">PreK–6</span>
            <span class="proof-label">All Grades</span>
          </div>
          <div class="proof-stat">
            <span class="proof-number">0</span>
            <span class="proof-label">Subscriptions</span>
          </div>
        </div>
      </section>

      <!-- Book Grid -->
      <section class="books-section">
        <div class="section-inner">
          <h2 class="section-h2">{{ booksHeading }}</h2>
          <div class="books-grid">
            <router-link
              v-for="book in curatedBooks"
              :key="book.id"
              :to="`/book/${book.id}/1`"
              class="book-card"
            >
              <img
                :src="book.coverImage"
                :alt="`${book.title} - Free interactive story for ${book.gradeLevel}`"
                class="book-cover"
                loading="lazy"
              />
              <div class="book-info">
                <span class="book-title">{{ book.title }}</span>
                <span class="book-meta">{{ book.genre }} · {{ book.gradeLevel }}</span>
              </div>
            </router-link>
          </div>
          <div class="books-cta-row">
            <router-link to="/books" class="cta-secondary">See All {{ totalBooks }} Stories →</router-link>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section">
        <div class="section-inner">
          <h2 class="section-h2">{{ featuresHeading }}</h2>
          <div class="features-grid">
            <div class="feature-card" v-for="(feature, i) in features" :key="feature.title">
              <div class="feature-icon">{{ featureIcons[i] || '✦' }}</div>
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section class="testimonials-section">
        <div class="section-inner">
          <h2 class="section-h2 testimonials-heading">What People Are Saying</h2>
          <div class="testimonials-grid">
            <div class="testimonial-card">
              <p class="testimonial-quote">"We downloaded the app and my child immediately read four books without stopping. She loves it!"</p>
              <span class="testimonial-author">— Anna R., 1st Grade Mother</span>
            </div>
            <div class="testimonial-card">
              <p class="testimonial-quote">"This app has been a godsend for my students. Some hate conventional reading but love Wonder Stories."</p>
              <span class="testimonial-author">— Caupron S., Behavioral Therapist</span>
            </div>
            <div class="testimonial-card">
              <p class="testimonial-quote">"I love that it asks kids questions throughout the story and keeps them thinking."</p>
              <span class="testimonial-author">— Jesse K., 4th Grade Teacher</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Research/Credibility Section -->
      <section class="research-section">
        <div class="research-inner">
          <div class="research-content">
            <h2 class="section-h2 research-heading">Built from 4 years of research with 300+ reluctant readers</h2>
            <p class="research-text">Created by Elliott Hedman (PhD, MIT Media Lab), Wonder Stories were developed using emotional sensors and eye-tracking technology at Boys &amp; Girls Clubs and Title 1 schools. The research found that questions are the strongest engagement point in reading — so every Wonder Story is built around inquiry-based reading.</p>
            <div class="research-features">
              <span class="research-tag">Limited text per screen</span>
              <span class="research-tag">Frequent interaction</span>
              <span class="research-tag">Constant feedback</span>
              <span class="research-tag">Minimal distractions</span>
              <span class="research-tag">Participatory stories</span>
            </div>
            <a href="https://www.wonderstories.app/research" class="research-link" target="_blank" rel="noopener">Read the Research →</a>
          </div>
          <div class="research-image">
            <img
              src="../assets/Images/landing/reading-girl.jpg"
              alt="Child engaged with Wonder Stories at a reading session"
              class="research-photo"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section class="faq-section" v-if="faqs.length > 0">
        <div class="section-inner">
          <h2 class="section-h2">Frequently Asked Questions</h2>
          <div class="faq-list">
            <details v-for="faq in faqs" :key="faq.question" class="faq-item">
              <summary class="faq-question">{{ faq.question }}</summary>
              <p class="faq-answer">{{ faq.answer }}</p>
            </details>
          </div>
        </div>
      </section>

      <!-- Bottom CTA -->
      <section class="bottom-cta">
        <div class="bottom-cta-inner">
          <h2>Ready to get your child reading?</h2>
          <p>81+ interactive stories. All grades. 100% free. No signup required.</p>
          <router-link to="/books" class="cta-primary cta-large">Start Reading Now</router-link>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <img
            src="../assets/Images/landing/wonderstories-logo.png"
            alt="Wonder Stories"
            class="footer-logo"
          />
          <p class="footer-company">MPATH LEARNING LABS</p>
        </div>
        <div class="footer-links">
          <router-link to="/interactive-books-for-kids">Interactive Books</router-link>
          <router-link to="/free-interactive-books">Free Books</router-link>
          <router-link to="/books-for-kids-with-adhd">Books for ADHD</router-link>
          <router-link to="/books-for-kids-with-dyslexia">Books for Dyslexia</router-link>
          <router-link to="/books">All Books</router-link>
        </div>
        <p class="footer-copy">© {{ new Date().getFullYear() }} Wonder Stories — Free interactive stories for every child.</p>
      </div>
    </footer>
  </div>
</template>

<script>
import bookMetadata from "@/assets/book-seo-metadata.json";
import { updateMetaTags } from "@/utils/seo.js";

export default {
  props: {
    title: String,
    subtitle: String,
    booksHeading: String,
    featuresHeading: { type: String, default: "Why Kids Love Wonder Stories" },
    features: { type: Array, default: () => [] },
    faqs: { type: Array, default: () => [] },
    filterFn: { type: Function, default: null },
    metaTitle: String,
    metaDescription: String,
    metaKeywords: String,
    canonicalPath: String,
  },
  data() {
    return {
      featureIcons: ['⚡', '🧩', '🎯'],
    };
  },
  computed: {
    allBooks() {
      return Object.values(bookMetadata);
    },
    curatedBooks() {
      const books = this.filterFn
        ? this.allBooks.filter(this.filterFn)
        : this.allBooks;
      return books.slice(0, 8);
    },
    totalBooks() {
      return this.allBooks.length;
    },
  },
  mounted() {
    updateMetaTags({
      title: this.metaTitle,
      description: this.metaDescription,
      keywords: this.metaKeywords,
      canonical: `https://wonder.io${this.canonicalPath}`,
    });
    this.addFaqSchema();
  },
  methods: {
    addFaqSchema() {
      if (!this.faqs || this.faqs.length === 0) return;
      const existing = document.querySelector("script[data-faq-schema]");
      if (existing) existing.remove();

      const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: this.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      };

      const script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-faq-schema", "");
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    },
  },
};
</script>

<style scoped>
/* ===== Base ===== */
.landing-page {
  min-height: 100vh;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  overflow-x: hidden;
}

/* ===== Navigation ===== */
.landing-nav {
  background: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.landing-logo {
  height: 36px;
  width: auto;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-link {
  color: #555;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.15s;
}

.nav-link:hover {
  color: #43A8A2;
}

.nav-cta-btn {
  background: #43A8A2;
  color: #fff;
  padding: 10px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.15s;
}

.nav-cta-btn:hover {
  background: #389e98;
  color: #fff;
}

/* ===== Hero ===== */
.hero {
  background: linear-gradient(135deg, #f0fafa 0%, #e8f4f3 100%);
  padding: 64px 24px 48px;
}

.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 48px;
}

.hero-content {
  flex: 1;
}

.free-badge {
  display: inline-block;
  background: #43A8A2;
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 16px;
}

.hero-h1 {
  font-size: 2.6rem;
  font-weight: 800;
  color: #2c3e50;
  margin: 0 0 16px 0;
  line-height: 1.15;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: #666;
  line-height: 1.6;
  margin: 0 0 28px 0;
  max-width: 520px;
}

.cta-primary {
  display: inline-block;
  background: #43A8A2;
  color: #fff;
  padding: 16px 36px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
  font-size: 1.1rem;
  transition: background 0.15s, transform 0.15s;
}

.cta-primary:hover {
  background: #389e98;
  transform: translateY(-1px);
  color: #fff;
}

.hero-image {
  flex: 0 0 380px;
}

.hero-screenshot {
  width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

/* ===== Social Proof Bar ===== */
.proof-bar {
  background: #302EA7;
  padding: 24px;
}

.proof-inner {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.proof-stat {
  display: flex;
  flex-direction: column;
}

.proof-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: #fff;
}

.proof-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

/* ===== Sections Common ===== */
.section-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 28px 0;
  text-align: center;
}

/* ===== Book Grid ===== */
.books-section {
  padding: 56px 0 40px;
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.book-card {
  text-decoration: none;
  color: inherit;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.book-cover {
  width: 100%;
  height: auto;
  display: block;
}

.book-info {
  padding: 12px 14px;
}

.book-title {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
  margin-bottom: 4px;
}

.book-meta {
  font-size: 0.72rem;
  color: #999;
}

.books-cta-row {
  text-align: center;
}

.cta-secondary {
  color: #43A8A2;
  font-weight: 600;
  text-decoration: none;
  font-size: 1rem;
}

.cta-secondary:hover {
  text-decoration: underline;
}

/* ===== Features ===== */
.features-section {
  padding: 56px 0;
  background: #f8fafa;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  background: #fff;
  padding: 28px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.feature-card h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 10px 0;
}

.feature-card p {
  font-size: 0.9rem;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

/* ===== Testimonials ===== */
.testimonials-section {
  padding: 56px 0;
}

.testimonials-heading {
  margin-bottom: 32px;
}

.testimonials-grid {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.testimonial-card {
  background: #f8fafa;
  border-left: 4px solid #43A8A2;
  padding: 24px;
  border-radius: 0 10px 10px 0;
}

.testimonial-quote {
  font-size: 0.95rem;
  line-height: 1.6;
  color: #444;
  font-style: italic;
  margin: 0 0 12px 0;
}

.testimonial-author {
  font-size: 0.8rem;
  color: #999;
  font-weight: 600;
}

/* ===== Research ===== */
.research-section {
  padding: 56px 24px;
  background: #f0fafa;
}

.research-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 48px;
}

.research-content {
  flex: 1;
}

.research-heading {
  text-align: left;
  font-size: 1.6rem;
}

.research-text {
  font-size: 1rem;
  color: #555;
  line-height: 1.6;
  margin: 0 0 20px 0;
}

.research-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.research-tag {
  background: #43A8A2;
  color: #fff;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
}

.research-link {
  display: inline-block;
  margin-top: 16px;
  color: #302EA7;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: color 0.2s;
}

.research-link:hover {
  color: #43A8A2;
}

.research-image {
  flex: 0 0 320px;
}

.research-photo {
  width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* ===== FAQ ===== */
.faq-section {
  padding: 56px 0;
}

.faq-list {
  max-width: 720px;
  margin: 0 auto;
}

.faq-item {
  border-bottom: 1px solid #e5e5e5;
  padding: 18px 0;
}

.faq-question {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  list-style: none;
  padding-right: 20px;
}

.faq-question::-webkit-details-marker {
  display: none;
}

.faq-question::before {
  content: "+";
  font-weight: 700;
  margin-right: 14px;
  color: #43A8A2;
  font-size: 1.2rem;
}

details[open] .faq-question::before {
  content: "−";
}

.faq-answer {
  font-size: 0.95rem;
  color: #666;
  line-height: 1.7;
  margin: 14px 0 0 28px;
}

/* ===== Bottom CTA ===== */
.bottom-cta {
  background: #302EA7;
  padding: 56px 24px;
  text-align: center;
}

.bottom-cta-inner {
  max-width: 600px;
  margin: 0 auto;
}

.bottom-cta h2 {
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 12px 0;
}

.bottom-cta p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.05rem;
  margin: 0 0 28px 0;
}

.cta-large {
  padding: 18px 48px;
  font-size: 1.2rem;
}

/* ===== Footer ===== */
.landing-footer {
  background: #1a1a2e;
  padding: 40px 24px;
  color: #888;
}

.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  text-align: center;
}

.footer-logo {
  height: 28px;
  width: auto;
  opacity: 0.7;
  margin-bottom: 8px;
}

.footer-company {
  font-size: 0.75rem;
  color: #666;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 16px 0;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.footer-links a {
  color: #888;
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.15s;
}

.footer-links a:hover {
  color: #43A8A2;
}

.footer-copy {
  font-size: 0.8rem;
  color: #555;
  margin: 0;
}

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .hero-inner {
    flex-direction: column;
    text-align: center;
  }

  .hero-subtitle {
    max-width: 100%;
  }

  .hero-image {
    flex: none;
    max-width: 320px;
  }

  .hero-h1 {
    font-size: 2rem;
  }

  .research-inner {
    flex-direction: column;
  }

  .research-heading {
    text-align: center;
  }

  .research-image {
    flex: none;
    max-width: 280px;
  }

  .testimonials-grid {
    grid-template-columns: 1fr;
  }

  .nav-links {
    display: none;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 40px 24px 32px;
  }

  .hero-h1 {
    font-size: 1.7rem;
  }

  .books-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .proof-inner {
    flex-wrap: wrap;
    gap: 16px;
  }

  .proof-stat {
    flex: 0 0 40%;
  }

  .bottom-cta h2 {
    font-size: 1.5rem;
  }

  .section-h2 {
    font-size: 1.4rem;
  }
}
</style>
