<template>
  <LandingPage
    title="Books for Kids with ADHD — Interactive Stories That Hold Attention"
    subtitle="Traditional books lose kids with ADHD after a few pages. Wonder.io's interactive stories keep them engaged with choices, built-in questions, and scoring — turning reading from a struggle into an adventure."
    booksHeading="Stories That Keep Active Minds Engaged"
    featuresHeading="Why Interactive Stories Work for ADHD"
    metaTitle="Books for Kids with ADHD — Free Interactive Stories | Wonder.io"
    metaDescription="Free interactive books designed for kids with ADHD. Choice-driven stories with built-in engagement keep easily distracted readers focused. 81+ books, all free."
    metaKeywords="books for kids with ADHD, ADHD reading, books for distracted kids, engaging books for ADHD, interactive books ADHD, reading help ADHD kids, focus books for kids, ADHD dyslexia reading"
    canonicalPath="/books-for-kids-with-adhd"
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
        { title: "Active, Not Passive", description: "ADHD brains need engagement. Every few pages, kids make a choice or answer a question — preventing the 'zone out' that happens with traditional books." },
        { title: "Short, Rewarding Loops", description: "Stories are broken into short segments with immediate feedback. Kids earn points and see progress, creating the quick reward cycles that ADHD brains respond to." },
        { title: "No Pressure, No Timers", description: "Kids read at their own pace. No timed tests, no penalties for wrong answers. Just encouragement and the freedom to explore stories without anxiety." },
      ],
      faqs: [
        { question: "How do interactive books help kids with ADHD?", answer: "Kids with ADHD struggle with sustained attention on passive activities like traditional reading. Interactive books break reading into shorter, engaging segments with choices and questions that require active participation. This keeps the ADHD brain engaged by providing the stimulation and novelty it craves." },
        { question: "Are these books specifically designed for ADHD?", answer: "Wonder.io books are designed for all kids, but their interactive format naturally benefits kids with ADHD, dyslexia, and other attention challenges. The choice-driven format, built-in comprehension checks, and scoring system address the specific needs of easily distracted readers." },
        { question: "What grade levels are available?", answer: "Wonder.io has 81+ interactive stories spanning PreK through Grade 6 (ages 4-12). Each book is labeled with a recommended grade level so you can find the right fit." },
        { question: "Can my child use this during school?", answer: "Yes! Many teachers use Wonder.io for independent reading time, reading centers, or homework. The comprehension questions built into each story align with common reading standards. No special accounts or permissions needed." },
        { question: "My child hates reading. Will this help?", answer: "Many parents report that kids who resist traditional books willingly engage with interactive stories. The key difference is agency — kids aren't passive consumers of text, they're active participants making decisions. This transforms reading from a chore into a game-like experience." },
        { question: "Do these books also help kids with dyslexia?", answer: "Yes. Many children have co-occurring ADHD and dyslexia. Wonder.io's interactive format helps with both — short segments reduce cognitive load for dyslexic readers, while choices and scoring keep ADHD brains engaged. We also have a dedicated page for books for kids with dyslexia." },
        { question: "Is there research supporting interactive reading for ADHD?", answer: "Research shows that interactive and gamified learning environments improve focus and retention for children with ADHD. The combination of choice-making, immediate feedback, and short engagement loops aligns with evidence-based strategies for supporting ADHD learners." },
      ],
    };
  },
};
</script>
