const axios = require('axios');
const fs = require('fs');

const API_URL = 'https://wonder-api.azurewebsites.net/book';

// Helper to extract story content from book pages
function extractStoryContent(pages) {
  let content = '';
  let title = '';

  for (const page of pages) {
    // Get title from chapter title pages
    if (page.type === 'chapterTitle' && !title) {
      title = page.pageTitleText || '';
      if (!title && page.pageParts && page.pageParts.length > 0) {
        const firstPart = page.pageParts[0];
        if (firstPart.lineParts && firstPart.lineParts[0]) {
          title = firstPart.lineParts[0].text || '';
        }
      }
    }

    // Extract text from read pages
    if (page.type === 'read' && page.pageParts) {
      for (const part of page.pageParts) {
        if (part.lineParts) {
          for (const line of part.lineParts) {
            if (line.text && line.text.trim()) {
              // Clean HTML tags and extra whitespace
              const cleanText = line.text
                .replace(/<[^>]*>/g, '')
                .replace(/\\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              if (cleanText) {
                content += cleanText + ' ';
              }
            }
          }
        }
      }
    }

    // Stop after ~500 words (enough for description generation)
    if (content.split(' ').length > 500) break;
  }

  return { title, content: content.trim() };
}

// Generate AI-powered description based on story content
function generateDescription(bookId, title, content, totalPages) {
  // Extract key story elements
  const wordCount = content.split(' ').length;
  const hasQuestions = content.toLowerCase().includes('question') || content.toLowerCase().includes('what') || content.toLowerCase().includes('who');

  // Determine themes and genre
  let genre = 'Adventure';
  let themes = [];

  if (content.match(/mystery|detective|case|clue|solve/i)) {
    genre = 'Mystery';
    themes.push('problem-solving');
  }
  if (content.match(/magic|wizard|spell|enchant/i)) {
    genre = 'Fantasy';
    themes.push('imagination');
  }
  if (content.match(/space|planet|alien|rocket/i)) {
    genre = 'Science Fiction';
    themes.push('exploration');
  }
  if (content.match(/pirate|treasure|ship|sail/i)) {
    genre = 'Pirate Adventure';
    themes.push('bravery');
  }
  if (content.match(/dinosaur|prehistoric|fossil/i)) {
    genre = 'Dinosaur Adventure';
    themes.push('discovery');
  }
  if (content.match(/history|ancient|temple|king|queen/i)) {
    genre = 'Historical Adventure';
    themes.push('learning');
  }

  // Estimate grade level based on complexity
  let gradeLevel = 'Grade 2-3';
  let ageRange = '7-9 years';
  if (totalPages < 30 || wordCount < 200) {
    gradeLevel = 'Grade 1-2';
    ageRange = '6-8 years';
  } else if (totalPages > 50 || wordCount > 400) {
    gradeLevel = 'Grade 3-4';
    ageRange = '8-10 years';
  }

  // Generate engaging description
  const storyStart = content.substring(0, 200).trim();
  const description = `${title ? title + ': ' : ''}An exciting ${genre.toLowerCase()} for ${gradeLevel.toLowerCase()} readers! ${storyStart}... This interactive story keeps kids engaged with ${hasQuestions ? 'comprehension questions, ' : ''}clickable choices, and ${themes.join(', ')} challenges. Perfect for children who struggle with focus or need extra engagement while reading.`;

  // Generate SEO-optimized meta description (155-160 chars)
  const metaDescription = `Interactive ${genre.toLowerCase()} for kids | ${gradeLevel} | ${title || `Book ${bookId}`} | Perfect for kids who struggle with focus | Engaging AI storytelling`;

  // Keywords
  const keywords = [
    `${genre.toLowerCase()} for kids`,
    `${gradeLevel.toLowerCase()} reading`,
    'interactive stories for children',
    'books for kids who struggle with focus',
    'engaging reading for ADHD',
    'AI storytelling for kids',
    ...themes.map(t => `${t} stories`)
  ].join(', ');

  return {
    description: description.substring(0, 600),
    metaDescription: metaDescription.substring(0, 160),
    keywords,
    genre,
    gradeLevel,
    ageRange,
    features: [
      'Interactive comprehension questions',
      hasQuestions ? 'Reading comprehension challenges' : 'Clickable story choices',
      'Engaging illustrations',
      'Perfect for kids who struggle with focus',
      'AI-powered engagement'
    ]
  };
}

async function generateMetadataForAllBooks() {
  try {
    console.log('🔍 Fetching book list from API...');
    const listResponse = await axios.get(API_URL);
    const bookList = listResponse.data;

    console.log(`📚 Found ${bookList.length} books`);
    console.log('📖 Fetching individual book content...\n');

    const metadata = {};
    let successCount = 0;
    let failureCount = 0;

    for (const bookItem of bookList) {
      const bookId = bookItem.bookId;

      try {
        // Fetch full book content
        const bookResponse = await axios.get(`${API_URL}/${bookId}`);
        const bookData = bookResponse.data;

        if (!bookData || !bookData.pages || bookData.pages.length === 0) {
          console.log(`⚠️  Book ${bookId}: No page data`);
          failureCount++;
          continue;
        }

        // Extract story content
        const { title, content } = extractStoryContent(bookData.pages);

        if (!content) {
          console.log(`⚠️  Book ${bookId}: No readable content`);
          failureCount++;
          continue;
        }

        // Generate metadata
        const seoData = generateDescription(
          bookId,
          title || bookItem.title,
          content,
          bookData.totalPages
        );

        // Store metadata
        metadata[bookId] = {
          id: bookId,
          title: title || bookItem.title || `Interactive Story ${bookId}`,
          author: bookItem.author,
          illustrator: bookItem.illustrator,
          totalPages: bookData.totalPages,
          coverImage: bookItem.bookCoverImageUrl,
          largeCoverImage: bookItem.largeBookCoverImageUrl,
          ...seoData,
          ogDescription: seoData.description.substring(0, 200),
          readingLevel: seoData.gradeLevel,
          wordCount: content.split(' ').length
        };

        successCount++;
        console.log(`✅ Book ${bookId}: "${metadata[bookId].title}" (${seoData.genre}, ${seoData.gradeLevel})`);

      } catch (error) {
        console.log(`❌ Book ${bookId}: Error - ${error.message}`);
        failureCount++;
      }

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Save to file
    const outputPath = 'src/assets/book-seo-metadata.json';
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

    console.log(`\n✨ Metadata generation complete!`);
    console.log(`📊 Success: ${successCount} books`);
    console.log(`⚠️  Failed: ${failureCount} books`);
    console.log(`💾 Saved to: ${outputPath}`);

    // Generate summary stats
    const genres = {};
    const grades = {};
    Object.values(metadata).forEach(book => {
      genres[book.genre] = (genres[book.genre] || 0) + 1;
      grades[book.gradeLevel] = (grades[book.gradeLevel] || 0) + 1;
    });

    console.log(`\n📈 Content breakdown:`);
    console.log('Genres:', genres);
    console.log('Grade levels:', grades);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

generateMetadataForAllBooks();
