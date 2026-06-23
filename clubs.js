const fetch = require('node-fetch');
const xml2js = require('xml2js');
const iconv = require('iconv-lite');

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

function sanitizeXml(xml) {
  return xml
    .replace(/\s+[\w:-]+=(?=[\s>])/g, ' ')
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/g, '&amp;');
}

async function fetchClubFeedOnce(feed) {
  const res = await fetch(feed.url, {
    timeout: 20000,
    headers: {
      'User-Agent': randomUA(),
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'cs-CZ,cs;q=0.9',
      'Referer': 'https://www.google.cz/',
    },
  });

  if (!res.ok) throw new Error(`Status code ${res.status}`);

  const buffer = await res.buffer();
  const sniff = buffer.slice(0, 200).toString('ascii');
  const encMatch = sniff.match(/encoding=["']([^"']+)["']/i);
  const encoding = encMatch ? encMatch[1].toLowerCase() : 'utf-8';
  let xml = iconv.decode(buffer, encoding);
  xml = sanitizeXml(xml);

  const parsed = await xml2js.parseStringPromise(xml, {
    explicitArray: true,
    ignoreAttrs: false,
    strict: false,
    trim: true,
  });

  let items = [];
  const rss = parsed.rss || parsed.RSS;
  const feed2 = parsed.feed || parsed.FEED;
  if (rss) {
    const channel = rss.channel?.[0] || rss.CHANNEL?.[0];
    items = channel?.item || channel?.ITEM || [];
  } else if (feed2) {
    items = feed2.entry || feed2.ENTRY || [];
  }

  return items.map(item => {
    const get = (key) => getText(item[key]) || getText(item[key.toUpperCase()]) || getText(item[key.toLowerCase()]) || '';
    const content = get('content:encoded') || get('CONTENT:ENCODED') || get('description') || '';
    const link = get('link') || get('LINK') || '';
    const title = stripHtml(get('title') || get('TITLE'));
    const pubDate = get('pubDate') || get('PUBDATE') || get('published') || new Date().toISOString();
    return {
      id: get('guid') || get('GUID') || link || String(Math.random()),
      title,
      perex: stripHtml(get('description') || get('DESCRIPTION') || content).slice(0, 300),
      url: link,
      publishedAt: pubDate,
      source: feed.name,
      sourceColor: feed.color,
      image: extractImage(content) || null,
      _clubOnly: feed.clubOnly || null,
      _content: content,
    };
  });
}

async function fetchClubFeed(feed) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await fetchClubFeedOnce(feed);
      console.log(`✅ ${feed.name} (klub): ${result.length} článků`);
      return { ok: true, name: feed.name, url: feed.url, count: result.length, items: result };
    } catch (err) {
      if (attempt === 2) {
        console.warn(`❌ ${feed.name} (pokus ${attempt}): ${err.message}`);
        return { ok: false, name: feed.name, url: feed.url, error: err.message, items: [] };
      }
      console.warn(`⚠️ ${feed.name} (pokus ${attempt}): ${err.message} — zkouším znovu...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

module.exports = { fetchClubFeed };
