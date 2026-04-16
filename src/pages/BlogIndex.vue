<template>
  <div class="blog-index-page">
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
          <router-link to="/books" class="nav-link">Books</router-link>
          <a href="https://www.wonderstories.app/research" class="nav-link" target="_blank" rel="noopener">Research</a>
          <router-link to="/books" class="nav-cta-btn">Start Reading</router-link>
        </div>
      </div>
    </nav>

    <main class="blog-main">
      <div class="blog-header">
        <h1>Wonder.io Blog</h1>
        <p>Research-backed tips on interactive reading, reluctant readers, and helping every child love books.</p>
      </div>

      <div class="blog-grid">
        <router-link
          v-for="post in posts"
          :key="post.slug"
          :to="`/blog/${post.slug}`"
          class="post-card"
        >
          <div class="post-category">{{ post.category }}</div>
          <h2 class="post-title">{{ post.title }}</h2>
          <p class="post-excerpt">{{ post.excerpt }}</p>
          <div class="post-meta">
            <span>{{ post.readingTime }} min read</span>
          </div>
        </router-link>
      </div>
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

export default {
  data() {
    return {
      posts: [
        {
          slug: "interactive-books-for-kids-with-adhd",
          title: "Best Interactive Books for Kids with ADHD",
          excerpt: "Kids with ADHD need books that work with their brains, not against them. Discover why interactive stories keep distracted readers engaged and reading longer.",
          category: "ADHD & Reading",
          readingTime: 7,
        },
        {
          slug: "interactive-reading-struggling-readers",
          title: "How Interactive Reading Helps Struggling Readers",
          excerpt: "Traditional books fail many kids. Research shows interactive reading — with choices, questions, and feedback — bridges the gap for reluctant and struggling readers.",
          category: "Reading Research",
          readingTime: 6,
        },
        {
          slug: "grade-by-grade-reading-guide",
          title: "Grade-by-Grade Reading Guide for Active Learners",
          excerpt: "What should your active learner be reading at each grade level? A practical guide from PreK through Grade 6 with book recommendations for every stage.",
          category: "Reading Guide",
          readingTime: 8,
        },
        {
          slug: "free-online-books-for-kids-parents-guide",
          title: "Free Online Books for Kids: A Parent's Guide",
          excerpt: "Navigating the world of free online reading for kids. What to look for, what to avoid, and the best free resources that actually help children learn.",
          category: "For Parents",
          readingTime: 6,
        },
        {
          slug: "interactive-vs-traditional-reading",
          title: "Interactive vs Traditional Reading: What Research Says",
          excerpt: "Does interactive reading actually help kids learn? We look at the research comparing interactive and traditional reading approaches for children.",
          category: "Reading Research",
          readingTime: 7,
        },
      ],
    };
  },
  mounted() {
    updateMetaTags({
      title: "Wonder.io Blog — Reading Tips for Parents & Teachers",
      description: "Research-backed articles on interactive reading, ADHD-friendly books, struggling readers, and helping every child love reading. Free tips from Wonder.io.",
      keywords: "interactive reading, kids reading tips, ADHD reading, struggling readers, children's books blog, reading research",
      canonical: "https://wonder.io/blog",
    });
  },
};
</script>

<style scoped>
.blog-index-page {
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
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 24px 60px;
}

.blog-header {
  text-align: center;
  margin-bottom: 48px;
}

.blog-header h1 {
  font-size: 2.4rem;
  font-weight: 800;
  margin: 0 0 12px 0;
}

.blog-header p {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

.blog-grid {
  display: grid;
  gap: 24px;
}

.post-card {
  display: block;
  text-decoration: none;
  color: inherit;
  padding: 28px;
  border: 1px solid #eee;
  border-radius: 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.post-card:hover {
  border-color: #43A8A2;
  box-shadow: 0 4px 16px rgba(67, 168, 162, 0.1);
}

.post-category {
  display: inline-block;
  background: #f0fafa;
  color: #43A8A2;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 12px;
}

.post-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.post-excerpt {
  font-size: 0.95rem;
  color: #666;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.post-meta {
  font-size: 0.8rem;
  color: #999;
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

@media (max-width: 768px) {
  .blog-header h1 {
    font-size: 1.8rem;
  }

  .nav-links .nav-link {
    display: none;
  }
}
</style>
