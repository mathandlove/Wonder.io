<template>
  <LandingPage
    title="Books for Kids with Dyslexia — Interactive Stories That Make Reading Fun"
    subtitle="Traditional books can feel like a wall for kids with dyslexia. Wonder.io's interactive stories break reading into manageable, engaging chunks with choices, questions, and instant feedback — turning frustration into confidence."
    booksHeading="Stories That Build Reading Confidence"
    featuresHeading="Why Interactive Stories Work for Dyslexia"
    metaTitle="Books for Kids with Dyslexia — Free Interactive Stories | Wonder.io"
    metaDescription="Free interactive books designed for kids with dyslexia. Short segments, visual engagement, and built-in comprehension support make reading accessible. 81+ books, all free."
    metaKeywords="books for kids with dyslexia, dyslexia reading, reading help dyslexia, dyslexia friendly books, interactive books dyslexia, struggling readers, reading confidence kids"
    canonicalPath="/books-for-kids-with-dyslexia"
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
        { title: "Short, Manageable Segments", description: "Stories are broken into bite-sized pages instead of long walls of text. Kids with dyslexia can focus on one small section at a time without feeling overwhelmed." },
        { title: "Visual + Interactive Support", description: "Every story pairs text with illustrations, choices, and interactive elements. Multiple modalities help kids with dyslexia process and retain what they're reading." },
        { title: "Built-In Comprehension Checks", description: "Questions woven into the story confirm understanding in real time. Kids get immediate feedback and can re-read sections naturally — no stigma, no falling behind." },
      ],
      faqs: [
        { question: "How do interactive books help kids with dyslexia?", answer: "Kids with dyslexia often struggle with sustained reading because decoding text requires so much effort. Interactive books help by breaking stories into shorter segments, pairing text with visuals, and providing choices that keep kids motivated to continue. The built-in comprehension questions also catch misunderstandings early, so kids can re-read before confusion compounds." },
        { question: "Are these books specifically designed for dyslexia?", answer: "Wonder.io books are designed for all kids, but their format naturally benefits kids with dyslexia. Short page segments reduce cognitive load, interactive choices maintain engagement through difficult passages, and the multi-modal approach (text + images + interaction) supports different processing styles." },
        { question: "What reading levels are available?", answer: "Wonder.io has 81+ interactive stories spanning PreK through Grade 6 (ages 4-12). Each book is labeled with grade level and age range, so you can find books that match your child's reading ability rather than their grade." },
        { question: "Can my child use these books with a reading tutor or specialist?", answer: "Yes! Many reading specialists and Orton-Gillingham tutors use Wonder.io as supplemental reading practice. The interactive format keeps kids engaged during sessions, and the comprehension questions provide natural discussion points." },
        { question: "My child avoids reading because it's hard. Will this help?", answer: "Many parents report breakthroughs with interactive stories. The key difference is that kids feel in control — they make choices, earn points, and progress at their own pace. When reading feels like a game instead of a chore, kids with dyslexia often surprise themselves with how much they can read." },
        { question: "Are these books free? Do I need a subscription?", answer: "Every book on Wonder.io is completely free. No subscriptions, no accounts, no credit cards. We believe reading support should be accessible to every family, regardless of budget." },
        { question: "Do interactive books work for kids with both dyslexia and ADHD?", answer: "Absolutely. Many children have co-occurring dyslexia and ADHD. Interactive stories address both: the short segments and multi-modal format help with dyslexia, while the choices and scoring system provide the engagement and novelty that ADHD brains need to stay focused." },
      ],
    };
  },
};
</script>
