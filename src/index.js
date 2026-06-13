const express = require('express');
const cors = require('cors');
const PersistentCache = require('./persistentCache');
const { fetchAllArticles, fetchArticlesForClub, fetchFeedDirect } = require('./rssService');

const app = express();
const cache = new PersistentCache(7200); // 2 hodiny, přežije restart

app.use(cors());
app.use(express.json());

app.get('/api/clubs', (req, res) => {
  const clubs = require('./clubs');
  res.json(clubs);
});

app.get('/api/debug', async (req, res) => {
  const results = await fetchFeedDirect();
  res.json(results);
});

app.get('/api/cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ ok: true, message: 'Cache vymazána' });
});

app.get('/api/sample', async (req, res) => {
  const articles = await fetchAllArticles();
  res.json(articles.slice(0, 30).map(a => ({
    source: a.source,
    title: a.title,
  })));
});

// Ukáže raw strukturu klubového feedu
app.get('/api/raw-club', async (req, res) => {
  const fetch = require('node-fetch');
  const xml2js = require('xml2js');
  const url = req.query.url || 'https://www.slavia.cz/rss.asp';
  try {
    const r = await fetch(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    let xml = await r.text();
    xml = xml.replace(/\s+[\w:-]+=(?=[\s>])/g, ' ').replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/g, '&amp;');
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: true, strict: false, trim: true });
    const topKeys = Object.keys(parsed);
    const channel = parsed.rss?.channel?.[0] || parsed.feed || parsed[topKeys[0]];
    const channelKeys = channel ? Object.keys(channel) : [];
    const firstItem = channel?.item?.[0] || channel?.entry?.[0] || null;
    res.json({ topKeys, channelKeys, firstItem });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/articles/:clubSlug', async (req, res) => {
  const { clubSlug } = req.params;
  const cacheKey = `articles_${clubSlug}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ articles: cached, fromCache: true });
  try {
    const articles = await fetchArticlesForClub(clubSlug);
    cache.set(cacheKey, articles);
    res.json({ articles, fromCache: false });
  } catch (err) {
    console.error('Chyba:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/articles', async (req, res) => {
  const cacheKey = 'articles_all';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ articles: cached, fromCache: true });
  try {
    const articles = await fetchAllArticles();
    cache.set(cacheKey, articles);
    res.json({ articles, fromCache: false });
  } catch (err) {
    console.error('Chyba:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`✅ Server běží na portu ${PORT}`);

  // Předehřátí cache — načteme všechny články hned po startu
  console.log('🔥 Předehřívám cache...');
  try {
    const articles = await fetchAllArticles();
    cache.set('articles_all', articles);

    // Načti také top kluby
    const clubs = require('./clubs');
    const topClubs = ['slavia-praha', 'sparta-praha', 'viktoria-plzen', 'banik-ostrava', 'sigma-olomouc'];
    for (const slug of topClubs) {
      const club = clubs.find(c => c.slug === slug);
      if (club) {
        const filtered = articles.filter(item => {
          const text = (item.title + ' ' + (item.perex || '') + ' ' + (item.url || '')).toLowerCase();
          return club.keywords.some(kw => text.includes(kw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
        });
        cache.set(`articles_${slug}`, filtered);
        console.log(`  ✅ ${club.name}: ${filtered.length} článků`);
      }
    }
    console.log('🔥 Cache předehřátá!');
  } catch (err) {
    console.warn('⚠️ Předehřátí cache selhalo:', err.message);
  }
});
