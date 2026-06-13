const Parser = require('rss-parser');
const clubs = require('./clubs');

const RSS_FEEDS = [
  // iSport — sekce přímo pro Chance ligu
  { name: 'iSport.cz', url: 'https://isport.blesk.cz/rss/fotbal-chance-liga/', color: '#E30613' },
  // iSport — obecný fotbal (přestupy, reprezentace s hráči klubů)
  { name: 'iSport.cz', url: 'https://isport.blesk.cz/rss/fotbal/', color: '#E30613' },
  // Sport.cz — fotbal
  { name: 'Sport.cz',  url: 'https://www.sport.cz/rss/fotbal/', color: '#003DA5' },
  // ČT Sport — vše (fotbal filtrujeme podle sekcí)
  { name: 'ČT Sport',  url: 'https://sport.ceskatelevize.cz/rss', color: '#004B87' },
  // iSport — domácí fotbal (druhá liga, pohár atd.)
  { name: 'iSport.cz', url: 'https://isport.blesk.cz/rss/fotbal-domaci-souteze/', color: '#E30613' },
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

// Stripne HTML tagy z content pole
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function articleMatchesClub(item, club) {
  // Hledáme ve všech dostupných textových polích
  const searchText = normalize([
    item.title || '',
    item.contentSnippet || '',
    stripHtml(item._content || ''),
    item.url || '',
  ].join(' '));

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
    let items = result.items.map(item => ({
      id: item.guid || item.link || String(Math.random()),
      title: item.title || '',
      perex: item.contentSnippet || stripHtml(item.content || '').slice(0, 300) || '',
      url: item.link || '',
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      source: feed.name,
      sourceColor: feed.color,
      image: item.enclosure?.url || extractImage(item.content) || null,
      // Interní pole pro matching — neposílá se klientovi
      _content: item.content || '',
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

  // Odstraň interní pole před odesláním
  const clean = filtered.map(({ _content, ...rest }) => rest);
  console.log(`⚽ ${club.name}: ${clean.length} článků`);
  return clean;
}

module.exports = { fetchAllArticles, fetchArticlesForClub, fetchFeedDirect };
