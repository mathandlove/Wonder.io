const axios = require('axios');
const fs = require('fs');

const GCS_BASE = 'https://storage.googleapis.com/wonder-stories-web.appspot.com/books/texts';
const API_URL = 'https://wonder-api.azurewebsites.net/book';

// Helper to extract story content from pageData
function extractStoryContent(pageData) {
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

    // Stop after ~500 words
    if (content.split(' ').length > 500) break;
  }

  return { chapterTitle, content: content.trim() };
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

// Generate description
function generateDescription(bookId, title, content, genre, totalPages) {
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

  // Extract engaging story start (first 150 chars)
  const storyStart = content.substring(0, 150).trim() + '...';

  // Full description
  const description = `${title ? title + ': ' : ''}An exciting FREE ${genre.toLowerCase()} for ${gradeLevel.toLowerCase()} readers! ${storyStart} This interactive story keeps kids engaged with ${hasQuestions ? 'comprehension questions, ' : ''}clickable choices, and problem-solving challenges. Perfect for children who struggle with focus or need extra engagement while reading. 100% free - no subscription required!`;

  // SEO meta description (155-160 chars)
  const metaDescription = `FREE ${genre} for kids | ${gradeLevel} | ${title || `Book ${bookId}`} | Helps kids who struggle with focus | Interactive story`;

  // Keywords
  const genreKeyword = genre.toLowerCase().replace(' adventure', '');
  const keywords = [
    'free interactive books for kids',
    `free ${genreKeyword} stories`,
    `${gradeLevel.toLowerCase()} reading`,
    'books for kids who struggle with focus',
    'free books for ADHD kids',
    'engaging reading for children',
    'interactive stories',
    'free educational books'
  ].join(', ');

  return {
    description: description.substring(0, 600),
    metaDescription: metaDescription.substring(0, 160),
    keywords,
    genre,
    gradeLevel,
    ageRange,
    ogDescription: (title ? title + ': ' : '') + storyStart,
    features: [
      '100% FREE - No subscription',
      'Interactive comprehension questions',
      hasQuestions ? 'Reading comprehension challenges' : 'Engaging story choices',
      'Colorful illustrations',
      'Perfect for kids who struggle with focus',
      'Keeps easily distracted readers engaged'
    ]
  };
}

async function generateMetadataFromGCS() {
  try {
    console.log('🔍 Fetching book list from API...');
    const listResponse = await axios.get(API_URL);
    const bookList = listResponse.data;

    console.log(`📚 Found ${bookList.length} books`);
    console.log('📖 Fetching book data from Google Cloud Storage...\n');

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

        // Extract content
        const { chapterTitle, content } = extractStoryContent(pages);

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

        // Generate SEO data
        const totalPages = bookData.pageData?.length || bookData.pages?.length || bookData.totalPages || 50;
        const seoData = generateDescription(bookId, cleanTitle, content, genre, totalPages);

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

      } catch (error) {
        console.log(`❌ Book ${bookId}: Error - ${error.message}`);
        failureCount++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
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

generateMetadataFromGCS();
