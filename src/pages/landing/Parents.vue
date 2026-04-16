<template>
  <LandingPage
    title="Wonder.io for Parents — Free Interactive Books Your Child Will Actually Read"
    subtitle="81+ free interactive stories with comprehension questions, choice-driven plots, and built-in scoring. Designed by reading researchers for kids PreK through Grade 6 — no account, no subscription, no ads."
    booksHeading="Books Kids Ask to Read Again"
    featuresHeading="Why Parents Choose Wonder.io"
    metaTitle="Wonder.io for Parents — Free Interactive Books for Kids | Wonder.io"
    metaDescription="Discover why parents and teachers choose Wonder.io. 81+ free interactive books for kids PreK-Grade 6. Research-backed design helps reluctant readers, ADHD, and dyslexia. No account needed."
    metaKeywords="free books for kids, interactive reading for kids, kids reading app, best reading app for kids, free online books for kids, reluctant reader books, books for kids with ADHD, reading help for kids, educational books online"
    canonicalPath="/parents"
    :features="features"
    :faqs="faqs"
  >
    <div style="background:#f8fafa; padding:56px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:1100px; margin:0 auto; padding:0 24px;">
        <h2 style="font-size:1.5rem; font-weight:700; color:#2c3e50; margin:0 0 28px 0;">From our research</h2>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px;">
          <router-link to="/blog/interactive-books-for-kids-with-adhd" style="display:flex; flex-direction:column; gap:8px; padding:20px; background:#fff; border:1px solid #eee; border-radius:10px; text-decoration:none;">
            <span style="font-size:0.72rem; font-weight:600; text-transform:uppercase; color:#43A8A2;">ADHD</span>
            <p style="font-size:0.92rem; font-weight:600; color:#2c3e50; margin:0; line-height:1.4;">Best Interactive Books for Kids with ADHD</p>
          </router-link>
          <router-link to="/blog/interactive-reading-struggling-readers" style="display:flex; flex-direction:column; gap:8px; padding:20px; background:#fff; border:1px solid #eee; border-radius:10px; text-decoration:none;">
            <span style="font-size:0.72rem; font-weight:600; text-transform:uppercase; color:#43A8A2;">Struggling Readers</span>
            <p style="font-size:0.92rem; font-weight:600; color:#2c3e50; margin:0; line-height:1.4;">How Interactive Reading Helps Struggling Readers</p>
          </router-link>
          <router-link to="/blog/grade-by-grade-reading-guide" style="display:flex; flex-direction:column; gap:8px; padding:20px; background:#fff; border:1px solid #eee; border-radius:10px; text-decoration:none;">
            <span style="font-size:0.72rem; font-weight:600; text-transform:uppercase; color:#43A8A2;">Reading Guide</span>
            <p style="font-size:0.92rem; font-weight:600; color:#2c3e50; margin:0; line-height:1.4;">Grade-by-Grade Reading Guide for Active Learners</p>
          </router-link>
          <router-link to="/blog/free-online-books-for-kids-parents-guide" style="display:flex; flex-direction:column; gap:8px; padding:20px; background:#fff; border:1px solid #eee; border-radius:10px; text-decoration:none;">
            <span style="font-size:0.72rem; font-weight:600; text-transform:uppercase; color:#43A8A2;">Parent Guide</span>
            <p style="font-size:0.92rem; font-weight:600; color:#2c3e50; margin:0; line-height:1.4;">Free Online Books for Kids: A Parent's Guide</p>
          </router-link>
          <router-link to="/blog/interactive-vs-traditional-reading" style="display:flex; flex-direction:column; gap:8px; padding:20px; background:#fff; border:1px solid #eee; border-radius:10px; text-decoration:none;">
            <span style="font-size:0.72rem; font-weight:600; text-transform:uppercase; color:#43A8A2;">Research</span>
            <p style="font-size:0.92rem; font-weight:600; color:#2c3e50; margin:0; line-height:1.4;">Interactive vs Traditional Reading: What Research Says</p>
          </router-link>
        </div>
      </div>
    </div>
  </LandingPage>
</template>

<script>
import LandingPage from "@/pages/LandingPage.vue";

export default {
  components: { LandingPage },
  data() {
    return {
      features: [
        {
          title: "Built for Reluctant Readers",
          description: "Kids who tune out after a page stay engaged for 4x longer with Wonder.io's interactive format. Every story has choices, questions, and scoring — so reading feels like a game, not a chore.",
        },
        {
          title: "Research-Backed Design",
          description: "Every book is designed around how kids actually learn to read. Short segments, immediate feedback, and comprehension checks built into the story — not bolted on at the end.",
        },
        {
          title: "Completely Free. No Catch.",
          description: "No subscription, no account, no ads. All 81+ books are free for any child, anytime. Wonder.io exists to get more kids reading — not to monetize their attention.",
        },
      ],
      faqs: [
        {
          question: "Is Wonder.io really free?",
          answer: "Yes, completely. All 81+ interactive books are free to read online. No account is required, no subscription, and no ads. We believe every child deserves access to great reading material regardless of family income.",
        },
        {
          question: "What ages is Wonder.io designed for?",
          answer: "Wonder.io has stories for PreK through Grade 6 (roughly ages 4–12). Each book is labeled with a recommended grade level and reading level, so you can find the right fit for your child.",
        },
        {
          question: "How is this different from other reading apps?",
          answer: "Most reading apps are digital versions of traditional books — passive reading with maybe some audio. Wonder.io books are genuinely interactive: kids make choices that change the story direction, answer comprehension questions embedded in the text, and earn scores. It's closer to a story-game than a digital book.",
        },
        {
          question: "My child has ADHD or dyslexia. Will this help?",
          answer: "Many parents of kids with ADHD and dyslexia find Wonder.io especially effective. The short segments reduce cognitive load for dyslexic readers, while the choices and immediate scoring keep ADHD brains engaged. Research shows interactive formats significantly improve reading time and retention for kids who struggle with attention.",
        },
        {
          question: "Can teachers use this in the classroom?",
          answer: "Absolutely. Many teachers use Wonder.io for independent reading time, reading centers, and homework. The comprehension questions built into each story align with common reading standards. No accounts or special permissions are needed.",
        },
        {
          question: "How do I know if my child is making progress?",
          answer: "Each book has a built-in scoring system — kids can see how many comprehension questions they got right. While Wonder.io doesn't have a formal progress dashboard, kids naturally want to improve their scores and move to harder books as their skills grow.",
        },
        {
          question: "Is the content safe and age-appropriate?",
          answer: "Yes. All stories are written for children and reviewed for age-appropriateness. There are no ads, no external links, and no user accounts — so there's nothing to worry about from a privacy or safety standpoint.",
        },
      ],
    };
  },
};
</script>

<style>
.parents-articles {
  background: #f8fafa;
  padding: 56px 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.parents-articles-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

.parents-articles h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 28px 0;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.article-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  text-decoration: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.article-card:hover {
  border-color: #43A8A2;
  box-shadow: 0 4px 12px rgba(67, 168, 162, 0.1);
}

.article-tag {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #43A8A2;
}

.article-card p {
  font-size: 0.92rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .articles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
