import bookMetadata from '../assets/book-seo-metadata.json';

/**
 * Update page meta tags for SEO
 * @param {Object} options - Meta tag options
 */
export function updateMetaTags(options) {
  const {
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    canonical,
    type = 'website'
  } = options;

  // Update title
  if (title) {
    document.title = title;
    updateMetaTag('property', 'og:title', ogTitle || title);
    updateMetaTag('property', 'twitter:title', ogTitle || title);
  }

  // Update description
  if (description) {
    updateMetaTag('name', 'description', description);
    updateMetaTag('property', 'og:description', ogDescription || description);
    updateMetaTag('property', 'twitter:description', ogDescription || description);
  }

  // Update keywords
  if (keywords) {
    updateMetaTag('name', 'keywords', keywords);
  }

  // Update OG image
  if (ogImage) {
    updateMetaTag('property', 'og:image', ogImage);
    updateMetaTag('property', 'twitter:image', ogImage);
  }

  // Update canonical URL
  if (canonical) {
    updateLinkTag('canonical', canonical);
  }

  // Update OG type
  updateMetaTag('property', 'og:type', type);
  updateMetaTag('property', 'og:url', canonical || window.location.href);
}

/**
 * Update or create a meta tag
 */
function updateMetaTag(attribute, key, content) {
  if (!content) return;

  let element = document.querySelector(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

/**
 * Update or create a link tag
 */
function updateLinkTag(rel, href) {
  let element = document.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

/**
 * Get SEO metadata for a book
 * @param {string|number} bookId - The book ID
 * @returns {Object|null} Book metadata or null if not found
 */
export function getBookMetadata(bookId) {
  return bookMetadata[String(bookId)] || null;
}

/**
 * Update meta tags for a book page
 * @param {string|number} bookId - The book ID
 * @param {number} pageNumber - The page number (for URL)
 */
export function updateBookMetaTags(bookId, pageNumber = 1) {
  const metadata = getBookMetadata(bookId);

  if (!metadata) {
    // Fallback generic meta for books without metadata
    updateMetaTags({
      title: `Free Interactive Story for Kids | Wonder.io`,
      description: `A free interactive story for kids who struggle with focus. Engaging AI-powered reading with comprehension questions. Perfect for active learners. No subscription required!`,
      keywords: 'free interactive stories for kids, free books for ADHD kids, engaging reading, AI storytelling',
      canonical: `https://wonder.io/book/${bookId}`,
      ogImage: `https://storage.googleapis.com/wonder-stories-web.appspot.com/books/images/book${bookId}/cover.png`
    });
    return;
  }

  // Update with book-specific metadata — canonical always points to landing page
  updateMetaTags({
    title: `${metadata.title} — Free Interactive Story for Kids | Wonder.io`,
    description: metadata.metaDescription,
    keywords: metadata.keywords,
    ogTitle: `${metadata.title} — Free Interactive Story for Kids | Wonder.io`,
    ogDescription: metadata.ogDescription,
    ogImage: metadata.largeCoverImage || metadata.coverImage,
    canonical: `https://wonder.io/book/${bookId}`,
    type: 'article'
  });

  // Add structured data for book
  addBookStructuredData(metadata, bookId);
}

/**
 * Add Schema.org structured data for a book
 */
function addBookStructuredData(metadata, bookId) {
  // Remove existing structured data for books
  const existing = document.querySelector('script[data-book-schema]');
  if (existing) {
    existing.remove();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    'name': metadata.title,
    'author': metadata.author ? {
      '@type': 'Person',
      'name': metadata.author
    } : undefined,
    'illustrator': metadata.illustrator ? {
      '@type': 'Person',
      'name': metadata.illustrator
    } : undefined,
    'description': metadata.description,
    'genre': metadata.genre,
    'audience': {
      '@type': 'Audience',
      'audienceType': 'Children',
      'suggestedMinAge': metadata.ageRange.split('-')[0].trim().replace(' years', ''),
      'suggestedMaxAge': metadata.ageRange.split('-')[1].trim().replace(' years', '')
    },
    'educationalLevel': metadata.gradeLevel,
    'interactivityType': 'active',
    'learningResourceType': 'Interactive Story',
    'isAccessibleForFree': true,
    'image': metadata.largeCoverImage || metadata.coverImage,
    'url': `https://wonder.io/book/${bookId}`,
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
      'availability': 'https://schema.org/InStock'
    },
    'keywords': metadata.keywords.split(', ')
  };

  const script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.setAttribute('data-book-schema', '');
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
}

/**
 * Update meta tags for the books listing page
 */
export function updateBooksListingMetaTags() {
  updateMetaTags({
    title: 'FREE Interactive Stories for Kids | 80+ Books for All Grade Levels | Wonder.io',
    description: '80+ FREE interactive stories and AI-powered books for kids who struggle with focus. Perfect for ADHD, easily distracted readers. Grades PreK-6. No subscription!',
    keywords: 'free interactive stories, free kids books, ADHD reading, engaging books for children, AI storytelling, educational stories, reading comprehension',
    canonical: 'https://wonder.io/books',
    ogTitle: 'Browse 80+ FREE Interactive Stories for Kids',
    ogDescription: 'Discover engaging, AI-powered stories designed for kids who struggle with focus. All grades, 100% free!',
    type: 'website'
  });
}

/**
 * Update meta tags for the home page
 */
export function updateHomeMetaTags() {
  // The default meta tags in public/index.html are already optimized for home
  // This function exists for consistency but can be enhanced if needed
  updateMetaTags({
    canonical: 'https://wonder.io/'
  });
}
