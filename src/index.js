const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const { fetchAllArticles, fetchArticlesForClub } = require('./rssService');

const app = express();
const cache = new NodeCache({ stdTTL: 600 }); // cache na 10 minut

app.use(cors());
app.use(express.json());

// GET /api/clubs - seznam všech klubů
app.get('/api/clubs', (req, res) => {
  const clubs = require('./clubs');
  res.json(clubs);
});

// GET /api/articles/:clubSlug - články pro konkrétní klub
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
    console.error('Chyba při načítání článků:', err.message);
    res.status(500).json({ error: 'Nepodařilo se načíst články.' });
  }
});

// GET /api/articles - všechny nejnovější články
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
    console.error('Chyba při načítání všech článků:', err.message);
    res.status(500).json({ error: 'Nepodařilo se načíst články.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server běží na portu ${PORT}`);
});
