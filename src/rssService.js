const Parser = require('rss-parser');
const clubs = require('./clubs');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; FotbalApp/1.0)',
  },
});

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

// Načte jeden RSS feed
async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
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
    console.warn(`⚠️  Feed ${feed.name} selhal: ${err.message}`);
    return [];
  }
}

// Pokusí se vytáhnout první obrázek z HTML obsahu
function extractImage(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// Načte všechny feedy paralelně
async function fetchAllArticles() {
  const results = await Promise.all(RSS_FEEDS.map(fetchFeed));
  const all = results.flat();

  // Seřadit od nejnovějšího
  all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return all;
}

// Načte článkly pro konkrétní klub
async function fetchArticlesForClub(clubSlug) {
  const club = clubs.find(c => c.slug === clubSlug);
  if (!club) throw new Error(`Klub "${clubSlug}" nenalezen`);

  const allArticles = await fetchAllArticles();
  return allArticles.filter(item => articleMatchesClub(item, club));
}

module.exports = { fetchAllArticles, fetchArticlesForClub };
