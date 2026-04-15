<template>
  <LandingPage
    title="Free Interactive Books — No Subscriptions, No Catch"
    subtitle="81+ completely free interactive books for kids. No accounts, no trials, no credit cards. Just great stories with choices, questions, and scores."
    booksHeading="Start Reading Free"
    metaTitle="Free Interactive Books for Kids — No Subscription | Wonder.io"
    metaDescription="Read 81+ free interactive books for kids online. No subscriptions or signups. Choice-driven stories with comprehension questions for Grades PreK-6."
    metaKeywords="free interactive books, free books for kids, free online books for kids, free kids books online, free children's books, no subscription kids books"
    canonicalPath="/free-interactive-books"
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
        { title: "100% Free, Forever", description: "No hidden costs, no premium tiers, no 'free trials.' Every book on Wonder.io is free to read, now and always." },
        { title: "No Account Required", description: "Kids can start reading immediately. No email addresses, no parent permission forms, no passwords to remember." },
        { title: "81+ Books & Growing", description: "A growing library of interactive stories across all grade levels. New books added regularly at no extra cost (because there is no cost)." },
      ],
      faqs: [
        { question: "Why is Wonder.io free?", answer: "We believe every child deserves access to engaging reading materials regardless of their family's financial situation. Wonder.io is built to make reading accessible to all kids." },
        { question: "Is there a catch? Will you start charging later?", answer: "No catch. Wonder.io's core library of interactive books will always be free. We're committed to keeping reading accessible for all children." },
        { question: "How does Wonder.io compare to other free book sites?", answer: "Most 'free' book sites offer a limited selection or require subscriptions for full access. Wonder.io's entire library of 81+ interactive books is freely available — and our books are genuinely interactive with choices and comprehension questions, not just static text." },
        { question: "Can teachers use these books in their classrooms?", answer: "Absolutely! Teachers can use Wonder.io books for independent reading, group activities, or homework assignments. No classroom licenses or school accounts needed — just share the link." },
        { question: "What devices work with Wonder.io?", answer: "Wonder.io works on any device with a web browser — computers, tablets, phones, and Chromebooks. No app downloads needed." },
      ],
    };
  },
};
</script>
