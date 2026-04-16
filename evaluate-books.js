const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GCS_BASE = 'https://storage.googleapis.com/wonder-stories-web.appspot.com/books/texts';
const API_URL = 'https://wonder-api.azurewebsites.net/book';

// Extract ALL story text from a book's pages
function extractFullText(pages) {
  let text = '';
  let questionCount = 0;
  let chapterCount = 0;
  let hasChoices = false;

  for (const page of pages) {
    if (!page || !page.type) continue;

    if (page.type === 'chapterTitle' || page.type === 'chaptertitle') {
      chapterCount++;
    }

    if (page.type === 'question' || page.type === 'questiontitle') {
      questionCount++;
    }

    if (page.type === 'choice') {
      hasChoices = true;
    }

    if (page.type === 'read') {
      // GCS format: page.text
      let raw = page.text || '';
      // API format: page.pageParts[].lineParts[].text
      if (!raw && page.pageParts) {
        for (const part of page.pageParts) {
          for (const line of (part.lineParts || [])) {
            if (line.text && (line.lineType === 'read' || !line.lineType)) {
              raw += line.text + ' ';
            }
          }
        }
      }
      const clean = raw
        .replace(/<im>[^<]*/g, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (clean) text += clean + ' ';
    }

    // Also extract question text for word count
    if (page.type === 'question' && page.pageParts) {
      for (const part of page.pageParts) {
        for (const line of (part.lineParts || [])) {
          if (line.text && line.lineType === 'question') {
            const clean = line.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            if (clean) text += clean + ' ';
          }
        }
      }
    }
  }

  return { text: text.trim(), questionCount, chapterCount, hasChoices };
}

// Count syllables in a word (approximation)
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

// Analyze text complexity
function analyzeText(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z]/g, '').length > 0);

  const totalWords = words.length;
  const totalSentences = Math.max(sentences.length, 1);
  const avgWordsPerSentence = totalWords / totalSentences;

  let totalSyllables = 0;
  let complexWords = 0; // 3+ syllables
  const uniqueWords = new Set();

  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z']/g, '').toLowerCase();
    if (!clean) continue;
    uniqueWords.add(clean);
    const syllables = countSyllables(clean);
    totalSyllables += syllables;
    if (syllables >= 3) complexWords++;
  }

  const avgSyllablesPerWord = totalWords > 0 ? totalSyllables / totalWords : 0;

  // Flesch-Kincaid Grade Level
  const fkGrade = totalWords > 0
    ? 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
    : 0;

  // Flesch Reading Ease (higher = easier)
  const fleschEase = totalWords > 0
    ? 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
    : 0;

  // Coleman-Liau Index
  const avgLettersPerWord = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0) / Math.max(totalWords, 1);
  const cliGrade = 0.0588 * (avgLettersPerWord * 100) - 0.296 * (totalSentences / totalWords * 100) - 15.8;

  return {
    totalWords,
    totalSentences,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    complexWordPercent: Math.round((complexWords / Math.max(totalWords, 1)) * 100),
    uniqueWordCount: uniqueWords.size,
    vocabularyDiversity: Math.round((uniqueWords.size / Math.max(totalWords, 1)) * 100),
    fkGrade: Math.round(fkGrade * 10) / 10,
    fleschEase: Math.round(fleschEase * 10) / 10,
    cliGrade: Math.round(cliGrade * 10) / 10,
  };
}

// Determine grade level from readability metrics
function determineGradeLevel(stats) {
  // For very short texts (< 100 words), readability formulas are unreliable
  // Use simpler heuristics
  if (stats.totalWords < 100) {
    if (stats.avgSyllablesPerWord < 1.3 && stats.avgWordsPerSentence < 10) {
      return { gradeLevel: 'Grade K-1', ageRange: '5-7 years', readingLevel: 'Beginning Reader' };
    }
    return { gradeLevel: 'Grade 1-2', ageRange: '6-8 years', readingLevel: 'Early Reader' };
  }

  // Average multiple indices for more reliable result
  const avgGrade = (stats.fkGrade + stats.cliGrade) / 2;

  let effectiveGrade = avgGrade;

  // Adjust based on vocabulary diversity (lower = simpler, more repetitive)
  if (stats.vocabularyDiversity < 40) effectiveGrade -= 0.5;
  if (stats.vocabularyDiversity > 55) effectiveGrade += 0.5;

  // Adjust based on sentence length
  if (stats.avgWordsPerSentence < 8) effectiveGrade -= 0.5;
  if (stats.avgWordsPerSentence > 14) effectiveGrade += 0.5;

  // For short books, readability formulas overestimate complexity
  // because a few long sentences skew the average significantly
  if (stats.totalWords < 200) effectiveGrade -= 1.0;
  else if (stats.totalWords < 300) effectiveGrade -= 0.5;

  // Long books with simple vocabulary shouldn't be K-1 — K-1 readers can't sustain
  // lengthy reading sessions regardless of vocabulary simplicity
  if (stats.totalWords > 1000 && effectiveGrade < 1.6) effectiveGrade = 1.6;
  if (stats.totalWords > 2000 && effectiveGrade < 2.6) effectiveGrade = 2.6;

  if (effectiveGrade <= 1.5) return { gradeLevel: 'Grade K-1', ageRange: '5-7 years', readingLevel: 'Beginning Reader' };
  if (effectiveGrade <= 2.5) return { gradeLevel: 'Grade 1-2', ageRange: '6-8 years', readingLevel: 'Early Reader' };
  if (effectiveGrade <= 3.5) return { gradeLevel: 'Grade 2-3', ageRange: '7-9 years', readingLevel: 'Developing Reader' };
  if (effectiveGrade <= 4.5) return { gradeLevel: 'Grade 3-4', ageRange: '8-10 years', readingLevel: 'Fluent Reader' };
  return { gradeLevel: 'Grade 4-5', ageRange: '9-11 years', readingLevel: 'Advanced Reader' };
}

// Calculate reading time
function calculateReadingTime(wordCount, gradeLevel, questionCount = 0) {
  // Children's reading speeds by grade level (words per minute)
  // These are "comfortable reading" speeds, not max speeds
  const wpmByGrade = {
    'Grade K-1': 60,
    'Grade 1-2': 80,
    'Grade 2-3': 110,
    'Grade 3-4': 130,
    'Grade 4-5': 150,
  };
  const wpm = wpmByGrade[gradeLevel] || 100;
  // Base reading time from word count
  let minutes = wordCount / wpm;
  // Add ~30 seconds per question for thinking/answering
  minutes += (questionCount * 0.5);
  minutes = Math.max(Math.ceil(minutes), 1);
  return `${minutes} min`;
}

// Detect genre and themes from title + content
function detectGenreAndTags(title, text) {
  const combined = (title + ' ' + text).toLowerCase();

  // Genre detection with priority ordering
  let genre = 'Adventure';
  const genrePatterns = [
    { genre: 'Mystery', patterns: /\b(mystery|detective|case of|clue|solve|investigate|suspect|evidence|whodunit|figure out who|missing)\b/i },
    { genre: 'Halloween', patterns: /\b(halloween|trick or treat|costume|spooky|haunted|ghost|skeleton|witch|vampire|jack-o-lantern|candy)\b/i },
    { genre: 'Pirate Adventure', patterns: /\b(pirate|treasure map|walk the plank|ahoy|buccaneer|pirate ship|jolly roger)\b/i },
    { genre: 'Science Fiction', patterns: /\b(space|planet|alien|rocket|astronaut|galaxy|robot|futuristic|laser|spacecraft)\b/i },
    { genre: 'Fantasy', patterns: /\b(dragon|wizard|spell|enchant|kingdom|fairy|unicorn|magic wand|sorcerer|enchanted)\b/i },
    { genre: 'School Story', patterns: /\b(school|classroom|teacher|homework|recess|cafeteria|principal|grade|lunch room|field trip)\b/i },
    { genre: 'Animal Story', patterns: /\b(dog|cat|puppy|kitten|bunny|rabbit|pet|animal|horse|pony)\b/i },
    { genre: 'Humor', patterns: /\b(funny|silly|laugh|joke|prank|hilarious|ridiculous|absurd|goofy)\b/i },
  ];

  // Track ALL matching genres as potential tags
  const matchedGenres = [];
  for (const { genre: g, patterns } of genrePatterns) {
    const matches = combined.match(new RegExp(patterns.source, 'gi'));
    if (matches) {
      matchedGenres.push({ genre: g, count: matches.length });
    }
  }

  // Primary genre = highest match count
  if (matchedGenres.length > 0) {
    matchedGenres.sort((a, b) => b.count - a.count);
    genre = matchedGenres[0].genre;
  }

  // Detect themes/tags
  const tags = new Set();
  tags.add(genre);

  // Theme detection — require stronger signals (3+ matches for common words,
  // or 2+ for more specific terms). Scale threshold by book length.
  const wordCount = combined.split(/\s+/).length;
  const minMatchesBase = wordCount > 1000 ? 4 : wordCount > 400 ? 3 : 2;

  const themePatterns = {
    'friendship': { pattern: /\b(friend|best friend|buddy|pal|teamwork)\b/i, min: 3 },
    'family': { pattern: /\b(mom|dad|mother|father|brother|sister|family|parent|grandma|grandpa)\b/i, min: Math.max(minMatchesBase, 4) },
    'school': { pattern: /\b(school|teacher|classroom|homework|recess|cafeteria|principal)\b/i, min: minMatchesBase },
    'animals': { pattern: /\b(dog|cat|puppy|kitten|bunny|rabbit|horse|bird|fish|pet|hamster|turtle|monkey|pig|cow|ant)\b/i, min: minMatchesBase },
    'nature': { pattern: /\b(woods|forest|garden|river|lake|mountain|ocean|beach|island)\b/i, min: 3 },
    'food': { pattern: /\b(cook|kitchen|bake|recipe|chef|cake|cookie|pizza|candy|chocolate|pudding|sauce)\b/i, min: 3 },
    'sports': { pattern: /\b(soccer|football|basketball|baseball|swim|race|goal|sport|bowling)\b/i, min: 3 },
    'science': { pattern: /\b(science|experiment|lab|inventor|chemistry|robot|machine|electric)\b/i, min: 2 },
    'holidays': { pattern: /\b(christmas|halloween|thanksgiving|birthday party|celebrate|holiday|easter|valentine|april fools)\b/i, min: 2 },
    'courage': { pattern: /\b(brave|courage|scared|afraid|fear|dare|hero)\b/i, min: 3 },
    'problem-solving': { pattern: /\b(solve|figure out|puzzle|clue|investigate|detective)\b/i, min: 3 },
    'imagination': { pattern: /\b(imagine|pretend|dream|wish|magic|wonder)\b/i, min: 3 },
    'humor': { pattern: /\b(funny|silly|laugh|joke|prank|hilarious|ridiculous|goofy)\b/i, min: 3 },
  };

  for (const [theme, { pattern, min }] of Object.entries(themePatterns)) {
    const matches = combined.match(new RegExp(pattern.source, 'gi'));
    if (matches && matches.length >= min) {
      tags.add(theme);
    }
  }

  // Add secondary genres as tags
  for (const mg of matchedGenres.slice(1)) {
    if (mg.count >= 2) tags.add(mg.genre);
  }

  return { genre, tags: Array.from(tags).slice(0, 8) };
}

async function fetchBookContent(bookId) {
  try {
    const gcsResponse = await axios.get(`${GCS_BASE}/book${bookId}.json`, { timeout: 10000 });
    return { data: gcsResponse.data, source: 'GCS' };
  } catch {
    try {
      const apiResponse = await axios.get(`${API_URL}/${bookId}`, { timeout: 10000 });
      return { data: apiResponse.data, source: 'API' };
    } catch {
      return null;
    }
  }
}

async function evaluateAllBooks() {
  console.log('Fetching book list...');
  const listResponse = await axios.get(API_URL);
  const bookList = listResponse.data;
  console.log(`Found ${bookList.length} books\n`);

  // Load CSV for title/author info
  const csvPath = path.join(__dirname, 'book-list.csv');
  const csvData = {};
  if (fs.existsSync(csvPath)) {
    const lines = fs.readFileSync(csvPath, 'utf8').split('\n').slice(1);
    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split(',');
      csvData[parts[0]] = { title: parts[1], author: parts[2], illustrator: parts[3] };
    }
  }

  // Load existing metadata
  const metadataPath = path.join(__dirname, 'src/assets/book-seo-metadata.json');
  const existing = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

  const results = {};
  const BATCH_SIZE = 10;
  const allBookIds = bookList.map(b => b.bookId);

  for (let i = 0; i < allBookIds.length; i += BATCH_SIZE) {
    const batch = allBookIds.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (bookId) => {
      const result = await fetchBookContent(bookId);
      if (!result) {
        console.log(`SKIP ${bookId}: Could not fetch`);
        return;
      }

      const { data, source } = result;
      const pages = data.pageData || data.pages || [];
      if (pages.length === 0) {
        console.log(`SKIP ${bookId}: No pages`);
        return;
      }

      const { text, questionCount, chapterCount, hasChoices } = extractFullText(pages);
      if (!text || text.length < 20) {
        console.log(`SKIP ${bookId}: No text content`);
        return;
      }

      const csv = csvData[bookId] || {};
      const existingBook = existing[bookId] || {};
      const title = csv.title || existingBook.title || data.title || `Book ${bookId}`;
      const author = csv.author || existingBook.author || data.author || 'Unknown';

      const stats = analyzeText(text);
      const levelInfo = determineGradeLevel(stats);
      const readingTime = calculateReadingTime(stats.totalWords, levelInfo.gradeLevel, questionCount);
      const { genre, tags } = detectGenreAndTags(title, text);

      results[bookId] = {
        id: bookId,
        title,
        author,
        totalPages: pages.length,
        // Evaluation results
        wordCount: stats.totalWords,
        readingTime,
        gradeLevel: levelInfo.gradeLevel,
        ageRange: levelInfo.ageRange,
        readingLevel: levelInfo.readingLevel,
        genre,
        tags,
        // Detailed stats for review
        _stats: {
          fkGrade: stats.fkGrade,
          cliGrade: stats.cliGrade,
          fleschEase: stats.fleschEase,
          avgWordsPerSentence: stats.avgWordsPerSentence,
          avgSyllablesPerWord: stats.avgSyllablesPerWord,
          complexWordPercent: stats.complexWordPercent,
          vocabularyDiversity: stats.vocabularyDiversity,
          questionCount,
          chapterCount,
          hasChoices,
        },
        // Previous values for comparison
        _previous: {
          gradeLevel: existingBook.gradeLevel,
          ageRange: existingBook.ageRange,
          genre: existingBook.genre,
          wordCount: existingBook.wordCount,
        },
      };

      const changed = existingBook.gradeLevel !== levelInfo.gradeLevel || existingBook.genre !== genre;
      const marker = changed ? ' ** CHANGED **' : '';
      console.log(`${bookId}: "${title}" | ${stats.totalWords}w | FK:${stats.fkGrade} CLI:${stats.cliGrade} | ${levelInfo.gradeLevel} (${levelInfo.ageRange}) | ${genre} | ${readingTime}${marker}`);
    });

    await Promise.all(promises);
  }

  // Save evaluation results
  const outputPath = path.join(__dirname, 'book-evaluation-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved evaluation to ${outputPath}`);

  // Summary
  const books = Object.values(results);
  const gradeDist = {};
  const genreDist = {};
  let changedCount = 0;

  for (const book of books) {
    gradeDist[book.gradeLevel] = (gradeDist[book.gradeLevel] || 0) + 1;
    genreDist[book.genre] = (genreDist[book.genre] || 0) + 1;
    if (book._previous.gradeLevel && book._previous.gradeLevel !== book.gradeLevel) changedCount++;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total evaluated: ${books.length}`);
  console.log(`Grade levels changed: ${changedCount}`);
  console.log(`\nGrade Distribution:`);
  for (const [grade, count] of Object.entries(gradeDist).sort()) {
    console.log(`  ${grade}: ${count}`);
  }
  console.log(`\nGenre Distribution:`);
  for (const [genre, count] of Object.entries(genreDist).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${genre}: ${count}`);
  }

  // Word count stats
  const wordCounts = books.map(b => b.wordCount).sort((a, b) => a - b);
  console.log(`\nWord Count Range: ${wordCounts[0]} - ${wordCounts[wordCounts.length - 1]}`);
  console.log(`Median: ${wordCounts[Math.floor(wordCounts.length / 2)]}`);
}

evaluateAllBooks().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
