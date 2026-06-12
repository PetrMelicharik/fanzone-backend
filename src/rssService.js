const Parser = require('rss-parser');
const clubs = require('./clubs');

const RSS_FEEDS = [
  { name: 'iSport.cz',   url: 'https://isport.blesk.cz/rss/fotbal/',        color: '#E30613' },
  { name: 'Sport.cz',    url: 'https://www.sport.cz/rss/fotbal/',            color: '#003DA5' },
  { name: 'Fotbal.cz',   url: 'https://www.fotbal.cz/rss/clanky.xml',        color: '#009933' },
  { name: 'ČT Sport',    url: 'https://sport.ceskatelevize.cz/rss',          color: '#004B87' },
  { name: 'Deník.cz',    url: 'https://www.denik.cz/rss/fotbal.rss',         color: '#D40000' },
  { name: 'inFotbal.cz', url: 'https://infotbal.cz/chance-liga/feed/',       color: '#1A7F3C' },
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
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
      'Referer': 'https://www.google.com/',
    },
  });
}

function normalize(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function articleMatchesClub(item, club) {
  const searchText = normalize(`${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`);
  return club.keywords.some(kw => searchText.includes(normalize(kw)));
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
    const items = result.items.map(item => ({
      id: item.guid || item.link || String(Math.random()),
      title: item.title || '',
      perex: item.contentSnippet || item.summary || '',
      url: item.link || '',
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      source: feed.name,
      sourceColor: feed.color,
      image: item.enclosure?.url || extractImage(item.content) || null,
    }));
    console.log(`✅ ${feed.name}: ${items.length} článků`);
    return { ok: true, name: feed.name, count: items.length, items };
  } catch (err) {
    console.warn(`❌ ${feed.name}: ${err.message}`);
    return { ok: false, name: feed.name, error: err.message, items: [] };
  }
}

// Debug endpoint — vrátí stav každého feedu zvlášť
async function fetchFeedDirect() {
  const results = await Promise.all(RSS_FEEDS.map(fetchFeed));
  return results.map(r => ({
    name: r.name,
    ok: r.ok,
    count: r.count || 0,
    error: r.error || null,
  }));
}

async function fetchAllArticles() {
  const results = await Promise.all(RSS_FEEDS.map(fetchFeed));
  const all = results.flatMap(r => r.items);
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
