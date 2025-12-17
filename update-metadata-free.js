const fs = require('fs');

// Read the generated metadata
const metadata = JSON.parse(fs.readFileSync('src/assets/book-seo-metadata.json', 'utf8'));

// Update each book to include "FREE" keyword
Object.keys(metadata).forEach(bookId => {
  const book = metadata[bookId];

  // Add FREE to description if not already there
  if (!book.description.includes('FREE')) {
    book.description = book.description.replace('This interactive story', 'This FREE interactive story');
    book.description += ' 100% free with no subscription required!';
  }

  // Update meta description to include FREE
  if (!book.metaDescription.includes('FREE')) {
    book.metaDescription = `FREE ${book.metaDescription}`.substring(0, 160);
  }

  // Add "free" to keywords
  if (!book.keywords.includes('free')) {
    book.keywords = 'free interactive books, ' + book.keywords;
  }

  // Update ogDescription to include FREE
  if (!book.ogDescription.includes('FREE')) {
    book.ogDescription = `FREE: ${book.ogDescription}`.substring(0, 200);
  }

  // Add FREE feature
  if (!book.features.includes('100% FREE - No subscription')) {
    book.features.unshift('100% FREE - No subscription');
  }
});

// Save updated metadata
fs.writeFileSync('src/assets/book-seo-metadata.json', JSON.stringify(metadata, null, 2));

console.log('✅ Updated all 81 books with FREE keywords!');
console.log('📝 Sample book metadata:');
console.log(JSON.stringify(metadata['1'], null, 2));
