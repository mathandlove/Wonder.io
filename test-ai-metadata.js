// Test script to generate AI metadata for a few books first
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const GCS_BASE = 'https://storage.googleapis.com/wonder-stories-web.appspot.com/books/texts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function extractStoryContent(pageData, maxWords = 1000) {
  let content = '';
  let chapterTitle = '';

  for (const page of pageData) {
    if (page.type === 'chapterTitle' && !chapterTitle) {
      chapterTitle = page.text || '';
    }
    if (page.type === 'read' && page.text) {
      const cleanText = page.text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanText) {
        content += cleanText + ' ';
      }
    }
    if (content.split(' ').length > maxWords) break;
  }
  return { chapterTitle, content: content.trim() };
}

function detectGenre(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  if (text.match(/mystery|detective|case|clue|solve|investigate|suspect|crime/i)) return 'Mystery';
  if (text.match(/pirate|treasure|ship|sail|crew|captain|ocean voyage/i)) return 'Pirate Adventure';
  if (text.match(/space|planet|alien|rocket|astronaut|galaxy|mars/i)) return 'Science Fiction';
  if (text.match(/school|classroom|teacher|homework|recess|bus/i)) return 'School Adventure';
  return 'Adventure';
}

async function generateAIDescription(title, content, genre, gradeLevel) {
  const prompt = `You are an expert at writing SEO-optimized, engaging descriptions for children's interactive stories that rank well on Google.

WONDER.IO POSITIONING & ANGLE:
Wonder.io provides 100% FREE AI-powered interactive stories specifically designed for kids who struggle with focus, ADHD, easily distracted readers, and active learners. Unlike competitors that charge $60-80/year (Epic!, Reading Eggs, Homer), Wonder.io is completely free with no subscription. Our stories keep kids engaged through interactive choices, comprehension questions, and problem-solving challenges - perfect for children who can't sit still with traditional books.

TARGET AUDIENCE: Parents searching for free alternatives to expensive reading apps, specifically parents of kids with focus challenges or ADHD.

Story Title: ${title}
Genre: ${genre}
Grade Level: ${gradeLevel}
Story Content (first 1000 words):
${content}

TARGET KEYWORDS (must include naturally):
- "FREE" (critical - emphasize prominently, mention "no subscription")
- "interactive story" or "interactive book"
- "${gradeLevel}" or the grade level
- "kids who struggle with focus" OR "ADHD" OR "easily distracted" (our unique positioning)
- "AI-powered" or "AI storytelling" (differentiator)
- Genre-specific keywords (${genre.toLowerCase()})

Based on this story, write:

1. SEO-OPTIMIZED HOOK (40-60 words):
   - Start with what makes this story exciting/engaging (the conflict, mystery, adventure, or challenge)
   - Naturally include 2-3 target keywords
   - Make parents/kids want to click
   - Focus on benefits: engaging, helps focus, interactive elements
   - Use power words: discover, solve, explore, adventure, mystery, etc.

2. META DESCRIPTION (exactly 140-155 characters):
   - Must start with "FREE"
   - Include genre + grade level
   - Include "kids who struggle with focus" OR "ADHD" OR "easily distracted"
   - Include story hook (brief)
   - End with call-to-action or benefit
   - Optimize for Google search results click-through rate

EXAMPLE FORMAT:
Hook: "When Max's puppy disappears from the backyard, young detectives must follow clues and interview neighbors to crack the case. This FREE interactive mystery keeps easily distracted readers engaged through clickable choices, comprehension questions, and detective challenges. Perfect for Grade 2 kids who struggle with focus - no subscription required!"

Meta: "FREE Mystery for Grade 2 | Solve the missing puppy case | Perfect for kids with ADHD/focus challenges | Interactive detective story | No subscription"

Guidelines:
- Be exciting and SEO-optimized
- Don't just repeat the opening lines - understand and describe the story's premise
- Use natural keyword placement (not keyword stuffing)
- Active voice, vivid language
- Focus on benefits and engagement

Return ONLY in this exact JSON format:
{
  "hook": "your SEO-optimized hook here (40-60 words)",
  "metaDescription": "your 140-155 char meta description here"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = message.content[0].text.trim();
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('No JSON found in AI response');
}

async function testBooks() {
  console.log('🧪 Testing AI metadata generation for Book 1 and Book 14...\n');

  const testBookIds = [1, 14];

  for (const bookId of testBookIds) {
    try {
      console.log(`\n📖 Testing Book ${bookId}...`);
      const gcsResponse = await axios.get(`${GCS_BASE}/book${bookId}.json`);
      const bookData = gcsResponse.data;

      const pages = bookData.pageData || [];
      const { content } = extractStoryContent(pages, 1000);

      const title = bookData.title || `Book ${bookId}`;
      const genre = detectGenre(title, content);
      const gradeLevel = 'Grade 3-4';

      console.log(`   Title: ${title}`);
      console.log(`   Genre: ${genre}`);
      console.log(`   Content length: ${content.length} chars`);
      console.log(`\n   🤖 Generating AI description...`);

      const aiDesc = await generateAIDescription(title, content, genre, gradeLevel);

      console.log(`\n   ✅ SUCCESS!`);
      console.log(`\n   HOOK (${aiDesc.hook.split(' ').length} words):`);
      console.log(`   ${aiDesc.hook}`);
      console.log(`\n   META DESCRIPTION (${aiDesc.metaDescription.length} chars):`);
      console.log(`   ${aiDesc.metaDescription}`);
      console.log(`\n   ---`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n✨ Test complete!');
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
  console.error('Set it with: export ANTHROPIC_API_KEY=your-key-here');
  process.exit(1);
}

testBooks();
