const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const CONCURRENCY = 4;
const RENDER_TIMEOUT = 15000; // wait 15s max per page

// All routes to prerender
const bookMetadata = require('./src/assets/book-seo-metadata.json');
const bookIds = Object.keys(bookMetadata).sort((a, b) => Number(a) - Number(b));
const routes = [
  '/',
  '/start',
  '/books',
  '/interactive-books-for-kids',
  '/interactive-stories-for-kids',
  '/free-interactive-books',
  '/books-for-kids-with-adhd',
  '/books-for-kids-with-dyslexia',
  '/free-online-books-for-kids',
  '/blog',
  '/blog/interactive-books-for-kids-with-adhd',
  '/blog/interactive-reading-struggling-readers',
  '/blog/grade-by-grade-reading-guide',
  '/blog/free-online-books-for-kids-parents-guide',
  '/blog/interactive-vs-traditional-reading',
  ...bookIds.map(id => `/book/${id}`),
  ...bookIds.map(id => `/book/${id}/1`)
];

// Simple static file server for the dist directory
function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(DIST_DIR, req.url);

      // For SPA routes, serve index.html
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath);
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.json': 'application/json',
        '.mp3': 'audio/mpeg',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
      };

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function renderRoute(browser, baseUrl, route) {
  const page = await browser.newPage();

  // Block external API calls to prevent hangs - we only need meta tags
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('wonder-api.azurewebsites.net') ||
        url.includes('googleapis.com/wonder') ||
        url.includes('google-analytics') ||
        url.includes('googletagmanager')) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.goto(`${baseUrl}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: RENDER_TIMEOUT
    });

    // Wait for Vue to mount and set meta tags
    await new Promise(resolve => setTimeout(resolve, 3000));

    const html = await page.content();

    // Determine output path
    let outputPath;
    if (route === '/') {
      outputPath = path.join(DIST_DIR, 'index.html');
    } else {
      outputPath = path.join(DIST_DIR, route, 'index.html');
    }

    // Create directory if needed
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, html);
    return true;
  } catch (err) {
    console.error(`  Failed: ${route} - ${err.message}`);
    return false;
  } finally {
    await page.close();
  }
}

async function main() {
  console.log(`Prerendering ${routes.length} routes...`);

  const server = await createServer();
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let success = 0;
  let failed = 0;

  // Process routes in batches
  for (let i = 0; i < routes.length; i += CONCURRENCY) {
    const batch = routes.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(route => renderRoute(browser, baseUrl, route))
    );

    results.forEach((ok, j) => {
      if (ok) {
        success++;
      } else {
        failed++;
      }
    });

    const progress = Math.min(i + CONCURRENCY, routes.length);
    process.stdout.write(`\r  Progress: ${progress}/${routes.length} (${success} ok, ${failed} failed)`);
  }

  console.log(`\nDone! ${success} pages prerendered, ${failed} failed.`);

  await browser.close();
  server.close();
}

main().catch(console.error);
