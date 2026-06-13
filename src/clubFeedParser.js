const fetch = require('node-fetch');
const xml2js = require('xml2js');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractImage(html) {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function getText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return getText(val[0]);
  if (val._) return val._;
  return String(val);
}

// Opraví nevalidní XML — odstraní atributy bez hodnot
function sanitizeXml(xml) {
  return xml
    // Odstraní atributy bez hodnot: class= nebo src= na konci tagu
    .replace(/\s+[\w:-]+=(?=[\s>])/g, ' ')
    // Odstraní nevalidní znaky
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/g, '&amp;');
}

async function fetchClubFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      timeout: 15000,
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'cs-CZ,cs;q=0.9',
        'Referer': 'https://www.google.cz/',
      },
    });

    if (!res.ok) throw new Error(`Status code ${res.status}`);

    let xml = await res.text();

    // Sanitizace nevalidního XML
    xml = sanitizeXml(xml);

    const parsed = await xml2js.parseStringPromise(xml, {
      explicitArray: true,
      ignoreAttrs: false,
      strict: false,       // tolerantní parsování
      trim: true,
    });

    // Podpora RSS 2.0 i Atom
    let items = [];
    if (parsed.rss?.channel?.[0]?.item) {
      items = parsed.rss.channel[0].item;
    } else if (parsed.feed?.entry) {
      items = parsed.feed.entry;
    }

    const result = items.map(item => {
      const content = getText(item['content:encoded']) || getText(item.description) || '';
      return {
        id: getText(item.guid) || getText(item.link) || String(Math.random()),
        title: stripHtml(getText(item.title)) || '',
        perex: stripHtml(getText(item.description) || content).slice(0, 300),
        url: getText(item.link) || '',
        publishedAt: getText(item.pubDate) || getText(item.published) || new Date().toISOString(),
        source: feed.name,
        sourceColor: feed.color,
        image: extractImage(content) || null,
        _clubOnly: feed.clubOnly || null,
        _content: content,
      };
    });

    console.log(`✅ ${feed.name} (klub): ${result.length} článků`);
    return { ok: true, name: feed.name, url: feed.url, count: result.length, items: result };
  } catch (err) {
    console.warn(`❌ ${feed.name} (klub): ${err.message}`);
    return { ok: false, name: feed.name, url: feed.url, error: err.message, items: [] };
  }
}

module.exports = { fetchClubFeed };
