<template>
  <LandingPage
    title="Free Interactive Books for Kids — Read Online"
    subtitle="81+ free interactive stories with built-in comprehension questions, choice-driven plots, and AI-powered engagement. Designed for kids who learn by doing. PreK through Grade 6."
    booksHeading="Popular Stories"
    metaTitle="Wonder.io — Free Interactive Books for Kids | PreK–Grade 6"
    metaDescription="81+ free interactive stories designed for kids who learn by doing. Built-in comprehension questions, choice-driven plots, and AI-powered engagement. Grades PreK-6. No subscription needed."
    metaKeywords="free interactive books for kids, free kids books online, interactive stories for children, reading for kids with ADHD, books for kids with dyslexia, educational stories, reading comprehension, PreK-6 books, free online books for kids"
    canonicalPath="/"
    :features="features"
    :faqs="faqs"
  />
</template>

<script>
import LandingPage from "@/pages/LandingPage.vue";

export default {
  components: { LandingPage },
  data() {
    return {
      features: [
        { title: "Built for Kids Who Learn by Doing", description: "Every story includes choice points, comprehension questions, and scoring that keeps active learners engaged — not passive page-turning." },
        { title: "Research-Backed Design", description: "Developed from 4 years of research at MIT Media Lab with 300+ reluctant readers. Emotional sensors and eye-tracking shaped every design decision." },
        { title: "100% Free, All Grades", description: "81+ stories from PreK through Grade 6. No subscriptions, no trials, no credit cards. Every child deserves access to engaging reading." },
      ],
      faqs: [
        { question: "What is Wonder.io?", answer: "Wonder.io is a free library of 81+ interactive stories for kids ages 4-12. Each story includes choice-driven plots, comprehension questions, and scoring to keep kids engaged. It was built from research at MIT Media Lab with 300+ reluctant readers." },
        { question: "Is Wonder.io really free?", answer: "Yes, 100%. Every book is completely free to read. No subscriptions, no trials, no credit cards. We believe every child deserves access to engaging reading materials." },
        { question: "What ages are the books for?", answer: "Wonder.io has books for kids ages 4-12, spanning PreK through Grade 6. Each book is labeled with a recommended grade level and age range so you can find the right fit." },
        { question: "How do the interactive features help my child read?", answer: "Interactive features keep kids engaged by giving them agency in the story. Built-in questions check comprehension as they read — not as a separate worksheet. Kids who struggle with focus (including those with ADHD or dyslexia) especially benefit from the short page segments, frequent interaction, and constant feedback." },
        { question: "Do I need to create an account?", answer: "No. You can start reading immediately with no signup, no account, and no personal information required. Just pick a book and go." },
        { question: "Can Wonder.io help kids with ADHD or dyslexia?", answer: "Yes. The stories were specifically designed for reluctant and easily distracted readers. Limited text per screen, frequent interaction points, constant feedback, and minimal distractions help kids with ADHD stay engaged. The visual design and short segments also help kids with dyslexia." },
      ],
    };
  },
};
</script>
