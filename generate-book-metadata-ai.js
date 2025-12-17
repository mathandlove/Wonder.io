const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../wonder.io/backend/.env') });
const OpenAI = require('openai');

const GCS_BASE = 'https://storage.googleapis.com/wonder-stories-web.appspot.com/books/texts';
const API_URL = 'https://wonder-api.azurewebsites.net/book';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to extract story content from pageData
function extractStoryContent(pageData, maxWords = 1000) {
  let content = '';
  let chapterTitle = '';

  for (const page of pageData) {
    // Get chapter title
    if (page.type === 'chapterTitle' && !chapterTitle) {
      chapterTitle = page.text || '';
    }

    // Extract text from read pages
    if (page.type === 'read' && page.text) {
      // Clean the text
      const cleanText = page.text
        .replace(/<[^>]*>/g, ' ') // Remove HTML-like tags
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanText) {
        content += cleanText + ' ';
      }
    }

    // Get enough content for AI to understand the story
    if (content.split(' ').length > maxWords) break;
  }

  return { chapterTitle, content: content.trim() };
}

// Use AI to generate book description (like back-of-book copy)
async function generateAIDescription(title, content, genre, gradeLevel) {
  const prompt = `You are an expert at writing back-cover book descriptions for children's stories.

STRICT RULES - READ CAREFULLY:

Your job is to write metadata that reads like the BACK COVER of a physical book.
- Focus on the STORY ITSELF: character, setting, conflict, stakes, emotion
- DO NOT mention the platform (Wonder.io), features, interactivity, or benefits
- DO NOT use medical/therapeutic language (ADHD, focus, autism, therapy)
- Each description must be UNIQUE and story-specific

Story Title: ${title}
Suggested Genre: ${genre} (NOTE: This may be incorrect - use your judgment based on the actual story content)
Grade Level: ${gradeLevel}
Story Content (first 1000 words):
${content}

IMPORTANT: Read the story and determine the ACTUAL genre. If the story doesn't match the suggested genre, use the correct genre instead.
For example, if labeled "Pirate Adventure" but it's actually about a family prank, call it "Adventure" or "Mystery".

Based on this story, write:

1. BOOK DESCRIPTION (40-60 words):
   Write like this appears on the back of a printed book.

   Include:
   - Main character's name (if clear from story)
   - Setting (where/when)
   - Central conflict or mystery (what problem needs solving?)
   - Emotional hook (why should kids care?)
   - Tone (funny, mysterious, adventurous)

   DO NOT include:
   - Platform features (interactive, clickable, choices)
   - Therapeutic claims (helps focus, engagement, ADHD)
   - Marketing language (FREE, no subscription) - save for meta
   - Generic phrases that could apply to any book

   Use active voice and vivid story-specific language.

2. META DESCRIPTION (exactly 130-150 characters):
   Format: "FREE [Genre] for Grade X-Y | [Story-specific hook mentioning character or conflict]"

   Rules:
   - Must start with "FREE"
   - Include grade level
   - Reference the main character OR central conflict (make it unique)
   - NO therapeutic language
   - NO platform features
   - Must be clearly different from other books

   Example: "FREE Mystery for Grade 3-4 | Jake investigates a mysterious egg in his bedroom before it hatches"

EXAMPLE - Mystery about finding a lost puppy:

Book Description: "When Max wakes up to find his puppy Scout missing from the backyard, he suspects foul play. With muddy paw prints leading to the neighbor's fence and Scout's favorite toy left behind, Max must interview suspects and follow clues around the neighborhood. Can he solve the mystery before dinnertime?"

Meta Description: "FREE Mystery for Grade 2-3 | Max searches for his missing puppy Scout with clues and suspects around the neighborhood"

VALIDATION CHECKLIST (verify before returning):
- [ ] Could this description appear on a physical book?
- [ ] Would it still make sense if Wonder.io didn't exist?
- [ ] Is it meaningfully different from other book descriptions?
- [ ] Does it focus on story, not platform?
- [ ] No medical/therapeutic claims?

Return ONLY in this exact JSON format:
{
  "description": "your back-of-book description here (40-60 words)",
  "metaDescription": "your meta description here (130-150 chars)"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 300,
      temperature: 0.7
    });

    const responseText = completion.choices[0].message.content.trim();
    // Extract JSON from response (in case AI adds extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in AI response');
  } catch (error) {
    console.error(`AI generation error: ${error.message}`);
    // Fallback to first 150 chars
    const storyStart = content.substring(0, 150).trim() + '...';
    return {
      hook: storyStart,
      metaDescription: `FREE ${genre} for ${gradeLevel} readers. ${title}.`
    };
  }
}

// Detect genre from content
function detectGenre(title, content) {
  const text = (title + ' ' + content).toLowerCase();

  if (text.match(/mystery|detective|case|clue|solve|investigate|suspect|crime/i)) {
    return 'Mystery';
  }
  if (text.match(/pirate|treasure|ship|sail|crew|captain|ocean voyage/i)) {
    return 'Pirate Adventure';
  }
  if (text.match(/space|planet|alien|rocket|astronaut|galaxy|mars/i)) {
    return 'Science Fiction';
  }
  if (text.match(/dinosaur|prehistoric|fossil|t-rex|jurassic/i)) {
    return 'Dinosaur Adventure';
  }
  if (text.match(/dragon|magic|wizard|spell|enchant|kingdom|fairy|fantasy/i)) {
    return 'Fantasy';
  }
  if (text.match(/school|classroom|teacher|homework|recess|bus/i)) {
    return 'School Adventure';
  }
  if (text.match(/haunted|ghost|scary|spooky|afraid|dark|creepy/i)) {
    return 'Mystery';
  }

  return 'Adventure';
}

// Generate complete metadata using AI
async function generateMetadata(bookId, title, content, genre, totalPages) {
  const wordCount = content.split(' ').length;
  const hasQuestions = content.toLowerCase().includes('question');

  // Estimate grade level
  let gradeLevel = 'Grade 2-3';
  let ageRange = '7-9 years';
  if (totalPages < 30 || wordCount < 200) {
    gradeLevel = 'Grade 1-2';
    ageRange = '6-8 years';
  } else if (totalPages > 60 || wordCount > 400) {
    gradeLevel = 'Grade 3-4';
    ageRange = '8-10 years';
  }

  // Use AI to generate back-of-book descriptions
  const aiDescriptions = await generateAIDescription(title, content, genre, gradeLevel);

  // Use AI-generated story description (no platform marketing)
  const description = aiDescriptions.description;

  // Use AI-generated meta description
  const metaDescription = aiDescriptions.metaDescription;

  // Keywords - focus on story/genre/grade, no medical terms
  const genreKeyword = genre.toLowerCase().replace(' adventure', '');
  const keywords = [
    'free stories for kids',
    `free ${genreKeyword} for children`,
    `${gradeLevel.toLowerCase()} reading`,
    'interactive children\'s books',
    `free ${genreKeyword} books`,
    'kids stories online'
  ].join(', ');

  return {
    description,
    metaDescription,
    keywords,
    genre,
    gradeLevel,
    ageRange,
    ogDescription: description,
    // Features removed - all books have the same features
  };
}

async function generateMetadataFromGCS() {
  try {
    console.log('🔍 Fetching book list from API...');
    const listResponse = await axios.get(API_URL);
    const bookList = listResponse.data;

    console.log(`📚 Found ${bookList.length} books`);
    console.log('📖 Fetching book data from Google Cloud Storage...');
    console.log('🤖 Using OpenAI GPT-4o to generate engaging descriptions...\n');

    const metadata = {};
    let successCount = 0;
    let failureCount = 0;

    for (const bookItem of bookList) {
      const bookId = bookItem.bookId;

      try {
        // Try Google Cloud Storage first
        let bookData = null;
        let source = 'GCS';

        try {
          const gcsResponse = await axios.get(`${GCS_BASE}/book${bookId}.json`);
          bookData = gcsResponse.data;
        } catch (gcsError) {
          // Fallback to API if GCS fails
          console.log(`⚠️  Book ${bookId}: GCS not found, trying API...`);
          const apiResponse = await axios.get(`${API_URL}/${bookId}`);
          bookData = apiResponse.data;
          source = 'API';
        }

        if (!bookData || (!bookData.pageData && !bookData.pages)) {
          console.log(`⚠️  Book ${bookId}: No page data`);
          failureCount++;
          continue;
        }

        // Handle both GCS (pageData) and API (pages) formats
        const pages = bookData.pageData || bookData.pages || [];

        // Extract content (get more for AI analysis)
        const { chapterTitle, content } = extractStoryContent(pages, 1000);

        if (!content || content.length < 50) {
          console.log(`⚠️  Book ${bookId}: Insufficient content`);
          failureCount++;
          continue;
        }

        // Use proper title (GCS format has it)
        const fullTitle = bookData.title || bookItem.title || chapterTitle || `Interactive Story ${bookId}`;
        const cleanTitle = fullTitle.replace(/\n/g, ' ').trim();

        // Detect genre
        const genre = detectGenre(cleanTitle, content);

        // Generate SEO data with AI
        const totalPages = bookData.pageData?.length || bookData.pages?.length || bookData.totalPages || 50;
        const seoData = await generateMetadata(bookId, cleanTitle, content, genre, totalPages);

        // Store metadata
        metadata[bookId] = {
          id: bookId,
          title: cleanTitle,
          author: bookData.author || bookItem.author || null,
          illustrator: bookData.illustrator || bookItem.illustrator || null,
          totalPages,
          coverImage: bookItem.bookCoverImageUrl,
          largeCoverImage: bookItem.largeBookCoverImageUrl,
          ...seoData,
          readingLevel: seoData.gradeLevel,
          wordCount: content.split(' ').filter(w => w.length > 0).length,
          source // Track where data came from
        };

        successCount++;
        console.log(`✅ Book ${bookId} (${source}): "${cleanTitle}" (${genre}, ${seoData.gradeLevel})`);
        console.log(`   Description: ${seoData.description.substring(0, 80)}...`);

        // Save progress after each book
        const outputPath = 'src/assets/book-seo-metadata.json';
        fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

        // Rate limiting for OpenAI API
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.log(`❌ Book ${bookId}: Error - ${error.message}`);
        failureCount++;
      }
    }

    // Save to file
    const outputPath = 'src/assets/book-seo-metadata.json';
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

    console.log(`\n✨ Metadata generation complete!`);
    console.log(`📊 Success: ${successCount} books`);
    console.log(`⚠️  Failed: ${failureCount} books`);
    console.log(`💾 Saved to: ${outputPath}`);

    // Generate stats
    const genres = {};
    const grades = {};
    const sources = {};

    Object.values(metadata).forEach(book => {
      genres[book.genre] = (genres[book.genre] || 0) + 1;
      grades[book.gradeLevel] = (grades[book.gradeLevel] || 0) + 1;
      sources[book.source] = (sources[book.source] || 0) + 1;
    });

    console.log(`\n📈 Content breakdown:`);
    console.log('Genres:', genres);
    console.log('Grade levels:', grades);
    console.log('Data sources:', sources);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found in wonder.io/backend/.env');
  process.exit(1);
}

generateMetadataFromGCS();
