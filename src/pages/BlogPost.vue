<template>
  <div class="blog-post-page">
    <nav class="blog-nav">
      <div class="nav-inner">
        <router-link to="/">
          <img
            class="nav-logo"
            alt="Wonder.io - Free Interactive Books for Kids"
            src="../assets/Images/landing/wonderstories-logo.png"
          />
        </router-link>
        <div class="nav-links">
          <router-link to="/blog" class="nav-link">Blog</router-link>
          <router-link to="/books" class="nav-link">Books</router-link>
          <router-link to="/books" class="nav-cta-btn">Start Reading</router-link>
        </div>
      </div>
    </nav>

    <main class="blog-main">
      <article class="blog-article">
        <div class="article-header">
          <router-link to="/blog" class="back-link">All Articles</router-link>
          <h1 class="article-title">{{ title }}</h1>
          <div class="article-meta">
            <span class="meta-author">By {{ author }}</span>
            <span class="meta-date">{{ publishDate }}</span>
            <span class="meta-reading">{{ readingTime }} min read</span>
          </div>
        </div>

        <div class="article-body">
          <slot></slot>
        </div>

        <div class="article-cta">
          <h3>Ready to get your child reading?</h3>
          <p>Try Wonder.io's 81+ free interactive books — no signup required.</p>
          <router-link to="/books" class="cta-btn">Browse All Books</router-link>
        </div>
      </article>

      <aside class="blog-sidebar">
        <div class="sidebar-section">
          <h3>Related Articles</h3>
          <div v-for="post in relatedPosts" :key="post.slug" class="sidebar-post">
            <router-link :to="`/blog/${post.slug}`" class="sidebar-link">
              {{ post.title }}
            </router-link>
          </div>
        </div>
        <div class="sidebar-section">
          <h3>Popular Categories</h3>
          <router-link to="/books-for-kids-with-adhd" class="sidebar-tag">ADHD Reading</router-link>
          <router-link to="/books-for-kids-with-dyslexia" class="sidebar-tag">Dyslexia Support</router-link>
          <router-link to="/free-interactive-books" class="sidebar-tag">Free Books</router-link>
          <router-link to="/interactive-books-for-kids" class="sidebar-tag">Interactive Books</router-link>
        </div>
      </aside>
    </main>

    <footer class="blog-footer">
      <div class="footer-inner">
        <p>&copy; {{ new Date().getFullYear() }} Wonder.io — Free interactive stories for every child.</p>
      </div>
    </footer>
  </div>
</template>

<script>
import { updateMetaTags } from "@/utils/seo.js";

const allBlogPosts = [
  { slug: "interactive-books-for-kids-with-adhd", title: "Best Interactive Books for Kids with ADHD" },
  { slug: "interactive-reading-struggling-readers", title: "How Interactive Reading Helps Struggling Readers" },
  { slug: "grade-by-grade-reading-guide", title: "Grade-by-Grade Reading Guide for Active Learners" },
  { slug: "free-online-books-for-kids-parents-guide", title: "Free Online Books for Kids: A Parent's Guide" },
  { slug: "interactive-vs-traditional-reading", title: "Interactive vs Traditional Reading: What Research Says" },
];

export default {
  props: {
    title: String,
    author: { type: String, default: "Wonder.io Team" },
    publishDate: String,
    readingTime: { type: [String, Number], default: "5" },
    metaTitle: String,
    metaDescription: String,
    metaKeywords: String,
    slug: String,
  },
  computed: {
    relatedPosts() {
      return allBlogPosts.filter((p) => p.slug !== this.slug).slice(0, 3);
    },
  },
  mounted() {
    updateMetaTags({
      title: this.metaTitle || `${this.title} | Wonder.io Blog`,
      description: this.metaDescription,
      keywords: this.metaKeywords,
      canonical: `https://wonder.io/blog/${this.slug}`,
      type: "article",
    });
    this.addArticleSchema();
  },
  methods: {
    addArticleSchema() {
      const existing = document.querySelector("script[data-article-schema]");
      if (existing) existing.remove();

      const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: this.title,
        author: {
          "@type": "Organization",
          name: "Wonder.io",
          url: "https://wonder.io",
        },
        publisher: {
          "@type": "Organization",
          name: "Wonder.io",
          url: "https://wonder.io",
        },
        datePublished: this.publishDate,
        dateModified: this.publishDate,
        url: `https://wonder.io/blog/${this.slug}`,
        mainEntityOfPage: `https://wonder.io/blog/${this.slug}`,
      };

      const script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-article-schema", "");
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    },
  },
};
</script>

<style scoped>
.blog-post-page {
  min-height: 100vh;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #2c3e50;
}

.blog-nav {
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

.nav-logo {
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
}

.nav-cta-btn:hover {
  background: #389e98;
  color: #fff;
}

.blog-main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 60px;
  display: flex;
  gap: 48px;
}

.blog-article {
  flex: 1;
  min-width: 0;
}

.back-link {
  color: #43A8A2;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}

.back-link:hover {
  text-decoration: underline;
}

.article-title {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 16px 0 12px 0;
  color: #2c3e50;
}

.article-meta {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eee;
}

.article-body {
  font-size: 1.05rem;
  line-height: 1.8;
  color: #444;
}

.article-body :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 36px 0 16px 0;
}

.article-body :deep(h3) {
  font-size: 1.2rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 28px 0 12px 0;
}

.article-body :deep(p) {
  margin: 0 0 16px 0;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 0 0 16px 0;
  padding-left: 24px;
}

.article-body :deep(li) {
  margin-bottom: 8px;
}

.article-body :deep(strong) {
  color: #2c3e50;
}

.article-body :deep(a) {
  color: #43A8A2;
  text-decoration: none;
}

.article-body :deep(a:hover) {
  text-decoration: underline;
}

.article-body :deep(blockquote) {
  border-left: 4px solid #43A8A2;
  margin: 24px 0;
  padding: 16px 24px;
  background: #f8fafa;
  border-radius: 0 8px 8px 0;
  font-style: italic;
  color: #555;
}

.article-cta {
  margin-top: 48px;
  padding: 32px;
  background: #f0fafa;
  border-radius: 12px;
  text-align: center;
}

.article-cta h3 {
  font-size: 1.3rem;
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.article-cta p {
  color: #666;
  margin: 0 0 20px 0;
}

.cta-btn {
  display: inline-block;
  background: #43A8A2;
  color: #fff;
  padding: 14px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
  font-size: 1rem;
}

.cta-btn:hover {
  background: #389e98;
  color: #fff;
}

.blog-sidebar {
  flex: 0 0 260px;
}

.sidebar-section {
  margin-bottom: 32px;
}

.sidebar-section h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #43A8A2;
}

.sidebar-post {
  margin-bottom: 10px;
}

.sidebar-link {
  color: #555;
  text-decoration: none;
  font-size: 0.9rem;
  line-height: 1.4;
}

.sidebar-link:hover {
  color: #43A8A2;
}

.sidebar-tag {
  display: inline-block;
  background: #f0fafa;
  color: #43A8A2;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  margin: 0 6px 8px 0;
}

.sidebar-tag:hover {
  background: #43A8A2;
  color: #fff;
}

.blog-footer {
  background: #1a1a2e;
  padding: 24px;
  text-align: center;
}

.blog-footer p {
  color: #666;
  font-size: 0.8rem;
  margin: 0;
}

@media (max-width: 900px) {
  .blog-main {
    flex-direction: column;
  }

  .blog-sidebar {
    flex: none;
  }

  .article-title {
    font-size: 1.7rem;
  }

  .nav-links .nav-link {
    display: none;
  }
}
</style>
