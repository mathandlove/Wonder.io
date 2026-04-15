# Wonder.io SEO & Traffic Growth Plan

**Created:** 2026-04-15
**Based on:** Google Search Console data (Jan 14 - Apr 13, 2026) for wonder.io and wonderstories.app

---

## Current State Summary

| Metric | wonder.io | wonderstories.app |
|---|---|---|
| Total Clicks (3 mo) | 163 | 2,036 |
| Total Impressions | ~7,900 | ~91,500 |
| Avg Daily Clicks | 1-2 | ~22 |
| Top Traffic Source | Brand searches only | Real keyword rankings |
| Avg Position | 2.3 | 15.4 |

**Core problem:** wonder.io has 80+ books but Google can't index them (Vue SPA serves empty HTML). wonderstories.app has keyword authority but no reading content. Authority is split across two domains.

---

## Tier 1: Critical Technical Fixes (Highest Impact)

### 1.1 Add Prerendering to Vue SPA -- DONE
- [x] Replaced incompatible `prerender-spa-plugin` with custom `prerender.js` using Puppeteer
- [x] All 81 book pages + `/` + `/books` = 83 routes prerendered successfully
- [x] Pre-rendered HTML verified: contains title tags, meta descriptions, OG tags, canonical URLs, and Schema.org structured data
- [x] API calls blocked during prerender to prevent timeouts (meta tags come from local metadata)
- [x] Build pipeline: `prebuild` generates sitemap -> `build` compiles -> `postbuild` prerenders
- [ ] Deploy and request re-indexing in Google Search Console

### 1.2 Fix the Sitemap -- DONE
- [x] `generate-sitemap.js` auto-generates sitemap from `book-seo-metadata.json` at build time
- [x] All 81 books included with real titles (e.g., "The Case of the Bedroom Egg" not "Interactive Story Book 1")
- [x] `<lastmod>` set to today's date on every build
- [x] `<image:title>` uses actual book names
- [x] Runs automatically via `prebuild` npm script
- [ ] Resubmit sitemap in Google Search Console after deploy
- [ ] Verify no 404s on sitemap URLs

### 1.3 Consolidate Domains -- NEEDS YOUR DECISION
- [ ] **Decide primary domain: wonder.io vs wonderstories.app** (see notes below)
- [ ] Set up proper 301 redirects from secondary to primary domain
- [ ] Update all canonical URLs to point to chosen primary domain
- [ ] Update Google Search Console to reflect primary property
- [ ] Update any external links/profiles to point to primary domain

**Domain decision notes:** wonderstories.app has 12x more organic traffic and real keyword rankings. wonder.io has a cleaner brand. Options:
- **Option A (easier):** Keep wonder.io as primary, add 301 redirects from wonderstories.app. You keep the brand but lose the existing keyword authority (~2,000 clicks/3mo).
- **Option B (more SEO value):** Move everything to wonderstories.app. Captures existing authority immediately but requires DNS/hosting changes.
- **Option C (compromise):** Add backlinks from wonderstories.app pointing to wonder.io book pages. Doesn't fully consolidate but passes some authority.

---

## Tier 2: Content & SEO Optimization (Medium Impact)

### 2.1 Create Keyword Cluster Landing Pages -- DONE

- [x] Created reusable `LandingPage.vue` template with: H1, description, curated book grid, features, FAQ section
- [x] Built `/interactive-books-for-kids` — targeting ~3,800 impressions cluster
- [x] Built `/interactive-stories-for-kids` — targeting ~1,500 impressions cluster
- [x] Built `/free-interactive-books` — targeting ~500 impressions cluster
- [x] Built `/books-for-kids-with-adhd` — unique differentiator, untapped keyword space
- [x] All pages: added to router (lazy-loaded), sitemap, and prerender pipeline
- [x] All pages: include FAQ schema (FAQPage structured data) for rich snippets
- [x] All pages: prerendered with full HTML content (87 total prerendered pages)

### 2.2 Improve Click-Through Rate (CTR) -- PARTIALLY DONE

- [x] Title tags use numbers and specifics ("81+ Free Interactive Books for Kids")
- [x] Meta descriptions include CTAs ("No subscription needed!")
- [x] FAQ schema added to all 4 landing pages (enables rich snippets)
- [ ] Add Review/Rating schema if you have any user feedback data
- [ ] Add Breadcrumb schema for book pages
- [ ] Consider adding `datePublished` and `dateModified` to book structured data

### 2.3 Add Visible Content to Book Pages -- DONE

- [x] Created `BookInfoSection.vue` component shown on page 1 of every book
- [x] Shows book title as H1, full description, author/illustrator credits
- [x] Displays grade level, age range, genre, and reading time estimate
- [x] Includes "Related Stories" section with internal links to same-genre books (4 books)
- [x] All content prerendered into static HTML for Google to crawl

### 2.4 Target High-Volume Keywords You're Missing

Currently invisible (position 50+) for massive keywords:

| Keyword | Monthly Impressions | Current Position |
|---|---|---|
| kids books online | 891 | 63 |
| children's books online | 328 | 60 |
| free online books for kids | 165 | 60 |
| free kids books online | 118 | 57 |
| interactive ebook | 157 | 62 |

- [ ] After prerendering is live, monitor position changes for these keywords
- [ ] Create dedicated content targeting "free online books for kids" cluster
- [ ] Optimize page titles and H1s for these terms
- [ ] Request re-indexing of key pages after content changes

---

## Tier 3: Growth Amplifiers (Long-term)

### 3.1 Blog / Content Marketing

Create a blog section at `/blog` or `/resources` targeting informational intent:

- [ ] Set up blog infrastructure (could be simple Vue pages or a CMS)
- [ ] Write: "Best Interactive Books for Kids with ADHD"
- [ ] Write: "How Interactive Reading Helps Struggling Readers"
- [ ] Write: "Grade-by-Grade Reading Guide for Active Learners"
- [ ] Write: "Free Online Books for Kids: A Parent's Guide"
- [ ] Write: "Interactive vs Traditional Reading: What Research Says"
- [ ] Add blog posts to sitemap
- [ ] Internal link from blog posts to relevant book pages

### 3.2 Backlink Outreach

- [ ] Compile list of ADHD/neurodiversity parent blogs
- [ ] Compile list of teacher resource aggregator sites
- [ ] Compile list of homeschooling community sites
- [ ] Compile list of ed-tech review sites
- [ ] Draft outreach email template highlighting free educational value
- [ ] Submit to "free resources for teachers" lists
- [ ] Submit to "free books for kids" roundup articles
- [ ] Consider guest posting on education blogs

### 3.3 Social & Community Distribution

- [ ] Create shareable book preview cards (OG images) for each book
- [ ] Share on parent/teacher Facebook groups
- [ ] Post on r/parenting, r/ADHD, r/homeschool, r/teachers
- [ ] Create Pinterest pins for book covers (strong for kids content)
- [ ] Engage in teacher forums (e.g., Teachers Pay Teachers community)

---

## Bot Traffic Investigation

### Evidence of Automated Queries on wonder.io

Programmatic `site:` queries with zero clicks account for ~1,500+ of wonder.io's impressions:
```
site:wonder.io "elliot hedman"                    → 355 impressions, 0 clicks
site:wonder.io/book "elliott hedman"              → 84 impressions, 0 clicks
site:wonder.io/book "author: elliott hedman"      → 80 impressions, 0 clicks
"the muddy race" "wonder.io/book"                 → 91 impressions, 0 clicks
"tobin" "wonder.io/book"                          → 69 impressions, 0 clicks
```

Impression spikes (Jan 25: 754, Feb 8: 838, Feb 21-22: 600+) with 0-1 clicks. Desktop accounts for 89% of impressions (unusual for children's content). This is consistent with SEO auditing tools or content scrapers.

### Monitoring Tasks

- [ ] Check GA4 for sessions with engagement time < 1 second AND single page view
- [ ] Create GA4 segment to isolate suspected bot traffic
- [ ] Check Firebase Hosting CDN logs for IP clustering and user-agent patterns
- [ ] Review Google Search Console > Settings > Crawl Stats for anomalies
- [ ] Consider adding a Firebase Cloud Function to log and analyze request patterns
- [ ] Set up GA4 alert for traffic spikes > 500 sessions/hour

### Impact Assessment

**Bot impressions are NOT hurting SEO.** Google Search Console counts impressions whenever your URL appears in results, even for bot queries. Rankings are unaffected. This is a monitoring/awareness issue, not an urgent fix.

---

## Recommended Priority Order

| Priority | Task | Effort | Impact |
|---|---|---|---|
| 1 | Prerendering (1.1) | Medium | Critical |
| 2 | Fix Sitemap (1.2) | Low | High |
| 3 | Domain Consolidation (1.3) | Medium | High |
| 4 | Visible Content on Book Pages (2.3) | Medium | High |
| 5 | Keyword Landing Pages (2.1) | Medium | Medium-High |
| 6 | CTR Improvements (2.2) | Low | Medium |
| 7 | Blog Content (3.1) | High | Medium (long-term) |
| 8 | Backlink Outreach (3.2) | High | Medium (long-term) |
| 9 | Bot Monitoring (Investigation) | Low | Low (informational) |

---

## Key Metrics to Track

- **Indexed pages** in Google Search Console (currently likely very low for wonder.io)
- **Average position** for "interactive books for kids" cluster
- **Clicks/day** from organic search (target: 50+/day within 3 months of prerendering)
- **CTR** on top landing pages (target: 5%+)
- **Number of keywords ranking on page 1** (position 1-10)
