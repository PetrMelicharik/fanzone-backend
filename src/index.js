const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const { fetchAllArticles, fetchArticlesForClub, fetchFeedDirect } = require('./rssService');

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

app.use(cors());
app.use(express.json());

// GET /api/clubs
app.get('/api/clubs', (req, res) => {
  const clubs = require('./clubs');
  res.json(clubs);
});

// GET /api/debug - testuje každý feed zvlášť, bez cache
app.get('/api/debug', async (req, res) => {
  const results = await fetchFeedDirect();
  res.json(results);
});

// GET /api/cache/clear - vymaže cache
app.get('/api/cache/clear', (req, res) => {
  cache.flushAll();
  res.json({ ok: true, message: 'Cache vymazána' });
});

// GET /api/articles/:clubSlug
app.get('/api/articles/:clubSlug', async (req, res) => {
  const { clubSlug } = req.params;
  const cacheKey = `articles_${clubSlug}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ articles: cached, fromCache: true });
  }

  try {
    const articles = await fetchArticlesForClub(clubSlug);
    cache.set(cacheKey, articles);
    res.json({ articles, fromCache: false });
  } catch (err) {
    console.error('Chyba:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/articles
app.get('/api/articles', async (req, res) => {
  const cacheKey = 'articles_all';

  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ articles: cached, fromCache: true });
  }

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
app.listen(PORT, () => {
  console.log(`✅ Server běží na portu ${PORT}`);
});
