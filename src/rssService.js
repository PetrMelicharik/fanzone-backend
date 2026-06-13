const Parser = require('rss-parser');
const clubs = require('./clubs');

const RSS_FEEDS = [
  // Obecné české fotbalové zdroje
  { name: 'iSport.cz', url: 'https://isport.blesk.cz/rss/fotbal-chance-liga/', color: '#E30613' },
  { name: 'iSport.cz', url: 'https://isport.blesk.cz/rss/fotbal/', color: '#E30613' },
  { name: 'iSport.cz', url: 'https://isport.blesk.cz/rss/fotbal-domaci-souteze/', color: '#E30613' },
  { name: 'Sport.cz',  url: 'https://www.sport.cz/rss/fotbal/', color: '#003DA5' },
  { name: 'ČT Sport',  url: 'https://sport.ceskatelevize.cz/rss', color: '#004B87' },

  // Oficiální weby klubů
  { name: 'Slavia Praha',    url: 'https://www.slavia.cz/feed/', color: '#CC0000', clubOnly: true },
  { name: 'Sparta Praha',    url: 'https://www.sparta.cz/feed/', color: '#AC1A2F', clubOnly: true },
  { name: 'Viktoria Plzeň',  url: 'https://www.fcviktoria.cz/feed/', color: '#003087', clubOnly: true },
  { name: 'Baník Ostrava',   url: 'https://www.fcbanik.cz/feed/', color: '#005CA9', clubOnly: true },
  { name: 'Sigma Olomouc',   url: 'https://www.sigmafotbal.cz/feed/', color: '#003366', clubOnly: true },
  { name: 'Bohemians 1905',  url: 'https://www.bohemians.cz/feed/', color: '#007A33', clubOnly: true },
  { name: 'Slovan Liberec',  url: 'https://www.fcslovanliberec.cz/feed/', color: '#003DA5', clubOnly: true },
  { name: 'FC Slovácko',     url: 'https://www.fcslovacko.cz/feed/', color: '#C8500A', clubOnly: true },
  { name: 'Mladá Boleslav',  url: 'https://www.fkmladaboleslav.cz/feed/', color: '#005BAC', clubOnly: true },
  { name: 'FK Jablonec',     url: 'https://www.fkjablonec.cz/feed/', color: '#F7A600', clubOnly: true },
  { name: 'FK Teplice',      url: 'https://www.fkteplice.cz/feed/', color: '#C8A200', clubOnly: true },
  { name: 'MFK Karviná',     url: 'https://www.mfkkarvina.cz/feed/', color: '#00529B', clubOnly: true },
  { name: 'Hradec Králové',  url: 'https://www.fchradec.cz/feed/', color: '#CC0000', clubOnly: true },
  { name: 'Dynamo Č.B.',     url: 'https://www.dynamocb.cz/feed/', color: '#1A1A1A', clubOnly: true },
  { name: 'Zbrojovka Brno',  url: 'https://www.zbrojovka.cz/feed/', color: '#003DA5', clubOnly: true },
  { name: 'Dukla Praha',     url: 'https://www.fkdukla.cz/feed/', color: '#CC9900', clubOnly: true },
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
  // Pokud článek pochází z oficiálního webu klubu, patří vždy tomuto klubu
  if (item._clubOnly) {
    return item._clubOnly === club.name;
  }

  // Jinak hledáme ve všech dostupných textových polích
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
      _content: item.content || '',
      // Pokud je feed oficiální web klubu, označíme článek — bude vždy patřit tomuto klubu
      _clubOnly: feed.clubOnly ? feed.name : null,
    }));

    // Vyloučí nesportovní sekce (jen pro obecné feedy)
    if (!feed.clubOnly) {
      items = items.filter(item => !isBlockedUrl(item.url));
    }

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
