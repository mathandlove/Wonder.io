const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, 'src', 'assets', 'book-seo-metadata.json');
const outputPath = path.join(__dirname, 'public', 'sitemap.xml');

const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
const today = new Date().toISOString().split('T')[0];

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Main Pages -->
  <url>
    <loc>https://wonder.io/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://wonder.io/books</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Landing Pages -->
  <url>
    <loc>https://wonder.io/interactive-books-for-kids</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://wonder.io/interactive-stories-for-kids</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://wonder.io/free-interactive-books</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://wonder.io/books-for-kids-with-adhd</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://wonder.io/books-for-kids-with-dyslexia</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Book Pages -->`;

const bookIds = Object.keys(metadata).sort((a, b) => Number(a) - Number(b));

for (const id of bookIds) {
  const book = metadata[id];
  const title = escapeXml(book.title);
  const coverImage = book.coverImage;

  xml += `
  <url>
    <loc>https://wonder.io/book/${id}/1</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${coverImage}</image:loc>
      <image:title>${title}</image:title>
    </image:image>
  </url>`;
}

xml += '\n</urlset>\n';

fs.writeFileSync(outputPath, xml, 'utf-8');
console.log(`Sitemap generated with ${bookIds.length} books at ${outputPath}`);
