<template>
  <LandingPage
    title="Free Online Books for Kids — Read Instantly in Your Browser"
    subtitle="81+ free online books for kids of all ages. No downloads, no apps, no accounts. Just open and start reading interactive stories with choices and comprehension questions."
    booksHeading="Read These Books Online Right Now"
    metaTitle="Free Online Books for Kids — Read in Browser | Wonder.io"
    metaDescription="Read 81+ free online books for kids instantly in your browser. No downloads or signups. Interactive stories with choices and questions for Grades PreK-6. Start reading now!"
    metaKeywords="free online books for kids, free kids books online, children's books online, free online books for children, kids books online free, read books online free for kids, online reading for kids"
    canonicalPath="/free-online-books-for-kids"
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
        { title: "Read in Any Browser", description: "No apps to download, no software to install. Wonder.io works on any device with a web browser — computers, tablets, phones, and Chromebooks." },
        { title: "Truly Interactive Stories", description: "These aren't just PDFs or static pages. Kids make choices, answer questions, and earn scores as they read. Every book keeps them actively engaged." },
        { title: "All Ages, All Free", description: "From PreK picture books to Grade 6 chapter stories — 81+ books covering mysteries, adventures, science fiction, and more. Every single one is free." },
      ],
      faqs: [
        { question: "Are these books really free to read online?", answer: "Yes, 100% free. Every book on Wonder.io is completely free to read online with no hidden costs, no subscriptions, and no premium tiers. We believe every child deserves access to engaging reading materials." },
        { question: "Do I need to create an account to read?", answer: "No account needed. Kids can start reading immediately — no email addresses, passwords, or parent permission forms required. Just pick a book and go." },
        { question: "What devices can kids use to read these books?", answer: "Any device with a web browser works — desktop computers, laptops, tablets (iPad, Android), phones, and Chromebooks. No app downloads needed." },
        { question: "What makes these different from other free online books?", answer: "Wonder.io books are genuinely interactive. Kids make choices that affect the story, answer comprehension questions throughout, and earn scores. Research shows this keeps kids reading 4x longer than traditional books." },
        { question: "Can these books be used in classrooms?", answer: "Absolutely! Teachers love using Wonder.io for independent reading, guided reading groups, and homework. No licenses or school accounts needed — just share the link with students." },
        { question: "What age range are these books for?", answer: "Wonder.io has books for ages 3-12, covering PreK through Grade 6. Each book shows its recommended grade level and age range so you can find the perfect fit." },
      ],
    };
  },
};
</script>
