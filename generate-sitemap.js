const axios = require('axios');
const fs = require('fs');

const API_URL = 'https://wonder-api.azurewebsites.net/book';
const DOMAIN = 'https://wonder.io';

async function generateSitemap() {
  try {
    console.log('Fetching books from API...');
    const response = await axios.get(API_URL);
    const books = response.data;

    console.log(`Found ${books.length} books`);

    const today = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Main Pages -->
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/books</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Book Pages -->
`;

    // Add each book (first page only for SEO)
    books.forEach(book => {
      const bookId = book.bookId;
      const imageUrl = book.bookCoverImageUrl || book.largeBookCoverImageUrl;

      sitemap += `  <url>
    <loc>${DOMAIN}/book/${bookId}/1</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>`;

      if (imageUrl) {
        sitemap += `
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${book.title || `Interactive Story Book ${bookId}`}</image:title>
    </image:image>`;
      }

      sitemap += `
  </url>
`;
    });

    sitemap += `</urlset>`;

    // Write to dist folder (for production) and public folder (for dev)
    fs.writeFileSync('dist/sitemap.xml', sitemap);
    console.log('✅ Sitemap generated at dist/sitemap.xml');
    console.log(`📊 Total URLs: ${books.length + 2}`);

    // Also save a copy to public if it exists
    if (fs.existsSync('public')) {
      fs.writeFileSync('public/sitemap.xml', sitemap);
      console.log('✅ Sitemap copied to public/sitemap.xml');
    }

  } catch (error) {
    console.error('❌ Error generating sitemap:', error.message);
    process.exit(1);
  }
}

generateSitemap();
