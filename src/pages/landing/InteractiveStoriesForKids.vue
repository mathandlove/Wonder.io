<template>
  <LandingPage
    title="Interactive Stories for Kids — Free to Read"
    subtitle="Engaging, choice-driven stories that put kids in the driver's seat. Each story adapts based on the reader's choices — keeping active learners focused and reading."
    booksHeading="Top Interactive Stories"
    metaTitle="Interactive Stories for Kids — Free Choice-Driven Stories | Wonder.io"
    metaDescription="81+ free interactive stories for kids with choices, quizzes, and scores. Perfect for active learners and kids who get bored with traditional books. Grades PreK-6."
    metaKeywords="interactive stories for kids, interactive reading for kids, choose your own adventure kids, free stories for children, engaging stories for kids"
    canonicalPath="/interactive-stories-for-kids"
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
        { title: "Stories That Respond", description: "Kids don't just read — they shape the story. Choices create branching paths that make every reading session unique." },
        { title: "Comprehension Built In", description: "No separate quizzes needed. Questions are woven naturally into the story, building understanding as kids read." },
        { title: "Scores & Progress", description: "Kids earn points for correct answers and can track their progress across stories. Gentle motivation that keeps them coming back." },
      ],
      faqs: [
        { question: "How are interactive stories different from regular ebooks?", answer: "Regular ebooks are static — kids scroll through text just like a physical book. Interactive stories on Wonder.io include choice points, comprehension questions, and scoring that make reading an active experience instead of a passive one." },
        { question: "Do kids need an account to read?", answer: "No account is needed. Kids can start reading any story immediately. Progress is saved locally on their device." },
        { question: "What genres of interactive stories do you have?", answer: "Wonder.io features mysteries, adventures, fantasy stories, science fiction, and more. Every genre is designed with interactive elements that match the story type." },
        { question: "Are these stories educational?", answer: "Yes. Each story includes grade-appropriate comprehension questions that assess reading understanding. The interactive format also builds critical thinking as kids evaluate choices and their consequences." },
      ],
    };
  },
};
</script>
