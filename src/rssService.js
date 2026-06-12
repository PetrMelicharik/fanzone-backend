const Parser = require('rss-parser');
const clubs = require('./clubs');

// Různé User-Agent hlavičky pro rotaci — některé weby blokují serverové requesty
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// RSS feedy českých sportovních médií
const RSS_FEEDS = [
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
    name: 'Fotbal.cz',
    url: 'https://www.fotbal.cz/rss/clanky.xml',
    color: '#009933',
  },
  {
    name: 'ČT Sport',
    url: 'https://sport.ceskatelevize.cz/rss',
    color: '#004B87',
  },
  {
    name: 'Deník.cz',
    url: 'https://www.denik.cz/rss/fotbal.rss',
    color: '#D40000',
  },
  {
    name: 'inFotbal.cz',
    url: 'https://infotbal.cz/chance-liga/feed/',
    color: '#1A7F3C',
  },
];

// Normalizace textu pro porovnávání (odstraní diakritiku, lowercase)
function normalize(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Zkontroluje, zda článek patří k danému klubu
function articleMatchesClub(item, club) {
  const searchText = normalize(`${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`);
  return club.keywords.some(keyword => searchText.includes(normalize(keyword)));
}

// Pokusí se vytáhnout první obrázek z HTML obsahu
function extractImage(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// Načte jeden RSS feed s retry logikou
async function fetchFeed(feed, attempt = 1) {
  const parser = new Parser({
    timeout: 15000,
    headers: {
      'User-Agent': randomUA(),
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Referer': 'https://www.google.com/',
    },
  });

  try {
    const result = await parser.parseURL(feed.url);
    console.log(`✅ ${feed.name}: ${result.items.length} článků`);
    return result.items.map(item => ({
      id: item.guid || item.link || Math.random().toString(36),
      title: item.title || '',
      perex: item.contentSnippet || item.summary || '',
      url: item.link || '',
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      source: feed.name,
      sourceColor: feed.color,
      image: item.enclosure?.url || extractImage(item.content) || null,
    }));
  } catch (err) {
    if (attempt < 2) {
      console.warn(`⚠️  ${feed.name} selhal (pokus ${attempt}), zkouším znovu...`);
      await new Promise(r => setTimeout(r, 1000));
      return fetchFeed(feed, attempt + 1);
    }
    console.warn(`❌ ${feed.name} selhal: ${err.message}`);
    return [];
  }
}

// Načte všechny feedy paralelně
async function fetchAllArticles() {
  console.log('📡 Načítám RSS feedy...');
  const results = await Promise.all(RSS_FEEDS.map(f => fetchFeed(f)));
  const all = results.flat();
  console.log(`📰 Celkem článků: ${all.length}`);

  all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return all;
}

// Načte články pro konkrétní klub
async function fetchArticlesForClub(clubSlug) {
  const club = clubs.find(c => c.slug === clubSlug);
  if (!club) throw new Error(`Klub "${clubSlug}" nenalezen`);

  const allArticles = await fetchAllArticles();
  const filtered = allArticles.filter(item => articleMatchesClub(item, club));
  console.log(`⚽ ${club.name}: ${filtered.length} článků`);
  return filtered;
}

module.exports = { fetchAllArticles, fetchArticlesForClub };
