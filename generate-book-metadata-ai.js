const axios = require('axios');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

require('dotenv').config({ path: path.join(__dirname, '.env.development') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const GCS_BASE = 'https://storage.googleapis.com/wonder-stories-web.appspot.com/books/texts';
const API_URL = 'https://wonder-api.azurewebsites.net/book';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract story text and author/illustrator from page data
function extractStoryContent(pageData, maxWords = 1000) {
  let content = '';
  let chapterTitle = '';

  for (const page of pageData) {
    if ((page.type === 'chapterTitle' || page.type === 'chaptertitle') && !chapterTitle) {
      chapterTitle = page.text || page.pageTitleText || '';
      if (!chapterTitle && page.pageParts && page.pageParts[0]?.lineParts?.[0]) {
        chapterTitle = page.pageParts[0].lineParts[0].text || '';
      }
    }

    if (page.type === 'read') {
      // GCS format: page.text
      const rawText = page.text || '';
      // API format: page.pageParts[].lineParts[].text
      let apiText = '';
      if (page.pageParts) {
        for (const part of page.pageParts) {
          for (const line of part.lineParts || []) {
            if (line.text) apiText += line.text + ' ';
          }
        }
      }
      const raw = rawText || apiText;
      const clean = raw
        .replace(/<[^>]*>/g, ' ')
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (clean) content += clean + ' ';
    }

    if (content.split(' ').length > maxWords) break;
  }

  return { chapterTitle, content: content.trim() };
}

function detectGenre(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  if (text.match(/mystery|detective|case|clue|solve|investigate|suspect/i)) return 'Mystery';
  if (text.match(/halloween|headless|ghost|haunted|spooky|skeleton|witch|vampire/i)) return 'Halloween';
  if (text.match(/pirate|treasure|ship|sail|captain/i)) return 'Pirate Adventure';
  if (text.match(/space|planet|alien|rocket|astronaut|galaxy/i)) return 'Science Fiction';
  if (text.match(/dinosaur|prehistoric|t-rex|fossil/i)) return 'Dinosaur Adventure';
  if (text.match(/dragon|wizard|spell|enchant|kingdom|fairy/i)) return 'Fantasy';
  if (text.match(/school|classroom|teacher|homework|recess/i)) return 'School Adventure';
  return 'Adventure';
}

function estimateGradeLevel(totalPages, wordCount) {
  if (totalPages < 30 || wordCount < 200) return { gradeLevel: 'Grade 1-2', ageRange: '6-8 years' };
  if (totalPages > 60 || wordCount > 400) return { gradeLevel: 'Grade 3-4', ageRange: '8-10 years' };
  return { gradeLevel: 'Grade 2-3', ageRange: '7-9 years' };
}

async function generateAIMetadata(title, author, content, genre, gradeLevel) {
  const prompt = `You are an expert SEO copywriter for a children's reading platform. Write metadata for this book that will rank well on Google and get clicks from parents searching for free kids' stories.

Book title: ${title}
Author: ${author || 'unknown'}
Genre: ${genre}
Grade level: ${gradeLevel}
Story content (first 1000 words):
${content.substring(0, 2000)}

Write the following. Return ONLY valid JSON, no other text.

{
  "description": "Back-cover style description, 40-60 words. Mention the main character by name, the setting, the central conflict, and a question that creates suspense. Vivid and specific to THIS story. No marketing language.",
  "metaDescription": "155-160 characters exactly. Format: 'Free [genre] story for [Grade X-Y]. [Specific hook about this story's character and conflict]. Read free on Wonder.io!' Make it compelling and click-worthy.",
  "ogDescription": "Same as description but max 200 chars, punchy.",
  "keywords": "8-10 comma-separated keywords. Mix: story-specific terms (character name, setting, plot element), genre terms, grade/age terms, and 2-3 high-volume search terms like 'free stories for kids' or 'interactive books for children'."
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = completion.choices[0].message.content.trim();
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Claude response');
  return JSON.parse(jsonMatch[0]);
}

async function generateMetadataForAllBooks() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found. Add it to .env or .env.development');
    process.exit(1);
  }

  console.log('🔍 Fetching book list from API...');
  const listResponse = await axios.get(API_URL);
  const bookList = listResponse.data;
  console.log(`📚 Found ${bookList.length} books`);

  // Load existing metadata so we can do incremental updates
  const outputPath = 'src/assets/book-seo-metadata.json';
  let existing = {};
  if (fs.existsSync(outputPath)) {
    existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }

  const metadata = { ...existing };
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;

  const force = process.argv.includes('--force');
  if (force) console.log('⚡ --force mode: regenerating all books');

  const CONCURRENCY = 10; // process 10 books at a time

  async function processBook(bookItem) {
    const bookId = bookItem.bookId;

    if (!force && existing[bookId]?.source === 'claude') {
      skippedCount++;
      return;
    }

    try {
      let bookData = null;
      let source = 'GCS';
      try {
        const gcsResponse = await axios.get(`${GCS_BASE}/book${bookId}.json`);
        bookData = gcsResponse.data;
      } catch {
        const apiResponse = await axios.get(`${API_URL}/${bookId}`);
        bookData = apiResponse.data;
        source = 'API';
      }

      if (!bookData) { console.log(`⚠️  Book ${bookId}: No data`); failureCount++; return; }

      const pages = bookData.pageData || bookData.pages || [];
      if (pages.length === 0) { console.log(`⚠️  Book ${bookId}: No pages`); failureCount++; return; }

      const { chapterTitle, content } = extractStoryContent(pages, 1000);
      if (!content || content.length < 50) { console.log(`⚠️  Book ${bookId}: No content`); failureCount++; return; }

      const rawTitle = bookData.title || bookItem.title || chapterTitle || `Interactive Story ${bookId}`;
      const cleanTitle = rawTitle.replace(/\n/g, ' ').trim();
      const author = bookItem.author || bookData.author || null;
      const illustrator = bookItem.illustrator || bookData.illustrator || null;
      const genre = detectGenre(cleanTitle, content);
      const totalPages = pages.length || bookData.totalPages || 50;
      const wordCount = content.split(' ').filter(w => w.length > 0).length;
      const { gradeLevel, ageRange } = estimateGradeLevel(totalPages, wordCount);

      const aiData = await generateAIMetadata(cleanTitle, author, content, genre, gradeLevel);

      const keywords = aiData.keywords || [
        `free ${genre.toLowerCase()} for kids`,
        `${gradeLevel.toLowerCase()} reading`,
        'free interactive stories for kids',
        'interactive children\'s books',
        'kids stories online',
      ].join(', ');

      metadata[bookId] = {
        id: bookId, title: cleanTitle, author, illustrator, totalPages,
        coverImage: bookItem.bookCoverImageUrl,
        largeCoverImage: bookItem.largeBookCoverImageUrl,
        description: aiData.description,
        metaDescription: aiData.metaDescription,
        keywords, genre, gradeLevel, ageRange,
        ogDescription: aiData.ogDescription || aiData.description,
        readingLevel: gradeLevel, wordCount, source: 'claude',
      };

      successCount++;
      console.log(`✅ Book ${bookId} (${source}): "${cleanTitle}" by ${author || 'unknown'}`);
      console.log(`   ${aiData.metaDescription}`);

    } catch (error) {
      console.log(`❌ Book ${bookId}: ${error.message}`);
      failureCount++;
    }
  }

  // Process in batches of CONCURRENCY
  for (let i = 0; i < bookList.length; i += CONCURRENCY) {
    const batch = bookList.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processBook));
    // Save after each batch
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
    console.log(`📦 Batch ${Math.floor(i / CONCURRENCY) + 1} done (${Math.min(i + CONCURRENCY, bookList.length)}/${bookList.length})`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
  console.log(`\n✨ Done! Success: ${successCount} | Failed: ${failureCount} | Skipped (already done): ${skippedCount}`);
  console.log(`💾 Saved to: ${outputPath}`);
}

generateMetadataForAllBooks().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
