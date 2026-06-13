const Parser = require('rss-parser');
const clubs = require('./clubs');

const RSS_FEEDS = [
  {
    name: 'iSport.cz',
    url: 'https://isport.blesk.cz/rss/fotbal-chance-liga/',
    color: '#E30613',
  },
  {
    name: 'iSport.cz',
    url: 'https://isport.blesk.cz/rss/fotbal/',
    color: '#E30613',
  },
  {
    name: 'Sport.cz',
    url: 'https://www.sport.cz/rss/fotbal/',
    color: '#003DA5',
  },
  {
    name: 'ČT Sport',
    url: 'https://sport.ceskatelevize.cz/rss',
    color: '#004B87',
  },
];

const BLOCKED_SECTIONS = ['mma', 'tenis', 'hokej', 'nhl', 'nba', 'atletika',
  'cyklistika', 'formule', 'volejbal', 'florbal', 'basketbal', 'golf',
  'motorismus', 'rychlobrusleni', 'biatlon', 'lyzovani', 'box', 'ostatni'];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function makeParser() {
  return new Parser({
    timeout: 20000,
    headers: {
      'User-Agent': randomUA(),
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'cs-CZ,cs;q=0.9',
      'Cache-Control': 'no-cache',
      'Referer': 'https://www.google.cz/',
    },
    // Načti také custom fields z RSS — včetně keywords
    customFields: {
      item: [
        ['media:keywords', 'mediaKeywords'],
        ['keywords', 'keywords'],
        ['news:keywords', 'newsKeywords'],
        ['category', 'categories', { keepArray: true }],
      ],
    },
  });
}

function normalize(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isBlockedUrl(url) {
  const u = normalize(url);
  return BLOCKED_SECTIONS.some(s => u.includes('/' + s + '-') || u.includes('/' + s + '/'));
}

// Vrátí všechna prohledávatelná slova z článku
function getSearchableText(item) {
  const parts = [];

  // Titulek
  if (item.title) parts.push(item.title);

  // RSS keywords pole (iSport je posílá)
  if (item.keywords) parts.push(item.keywords);
  if (item.mediaKeywords) parts.push(item.mediaKeywords);
  if (item.newsKeywords) parts.push(item.newsKeywords);

  // Categories / tags
  if (Array.isArray(item.categories)) parts.push(...item.categories);

  // Perex / snippet
  if (item.contentSnippet) parts.push(item.contentSnippet);

  // URL slug
  if (item.link) parts.push(item.link);

  return normalize(parts.join(' '));
}

function articleMatchesClub(item, club) {
  const text = getSearchableText(item);
  return club.keywords.some(kw => text.includes(normalize(kw)));
}

function extractImage(html) {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

async function fetchFeed(feed) {
  const parser = makeParser();
  try {
    const result = await parser.parseURL(feed.url);
    let items = result.items.map(item => ({
      id: item.guid || item.link || String(Math.random()),
      title: item.title || '',
      perex: item.contentSnippet || item.summary || '',
      url: item.link || '',
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      source: feed.name,
      sourceColor: feed.color,
      image: item.enclosure?.url || extractImage(item.content) || null,
      // Ulož keywords pro matchování
      _keywords: item.keywords || item.mediaKeywords || '',
      _categories: Array.isArray(item.categories) ? item.categories : [],
    }));

    // Vyloučí nesportovní sekce
    items = items.filter(item => !isBlockedUrl(item.url));

    console.log(`✅ ${feed.name}: ${items.length} článků`);
    return { ok: true, name: feed.name, url: feed.url, count: items.length, items };
  } catch (err) {
    console.warn(`❌ ${feed.name}: ${err.message}`);
    return { ok: false, name: feed.name, url: feed.url, error: err.message, items: [] };
  }
}

async function fetchFeedDirect() {
  const results = await Promise.all(RSS_FEEDS.map(fetchFeed));
  return results.map(r => ({
    name: r.name,
    url: r.url,
    ok: r.ok,
    count: r.count || 0,
    error: r.error || null,
  }));
}

async function fetchAllArticles() {
  const results = await Promise.all(RSS_FEEDS.map(fetchFeed));
  const seen = new Set();
  const all = [];
  for (const r of results) {
    for (const item of r.items) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        all.push(item);
      }
    }
  }
  all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  console.log(`📰 Celkem: ${all.length} článků`);
  return all;
}

async function fetchArticlesForClub(clubSlug) {
  const club = clubs.find(c => c.slug === clubSlug);
  if (!club) throw new Error(`Klub "${clubSlug}" nenalezen`);
  const all = await fetchAllArticles();
  const filtered = all.filter(item => articleMatchesClub(item, club));
  console.log(`⚽ ${club.name}: ${filtered.length} článků`);
  return filtered;
}

module.exports = { fetchAllArticles, fetchArticlesForClub, fetchFeedDirect };
