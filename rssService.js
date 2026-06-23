const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join('/tmp', 'fanzone_cache.json');

function load() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`📦 Persistentní cache načtena: ${Object.keys(data).length} klíčů`);
      return data;
    }
  } catch (err) {
    console.warn('⚠️ Nepodařilo se načíst persistentní cache:', err.message);
  }
  return {};
}

function save(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), 'utf8');
  } catch (err) {
    console.warn('⚠️ Nepodařilo se uložit persistentní cache:', err.message);
  }
}

class PersistentCache {
  constructor(ttlSeconds = 7200) {
    this.ttl = ttlSeconds * 1000;
    this.store = load();
  }

  get(key) {
    const entry = this.store[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      delete this.store[key];
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    this.store[key] = { value, timestamp: Date.now() };
    save(this.store);
  }

  del(key) {
    delete this.store[key];
    save(this.store);
  }

  flushAll() {
    this.store = {};
    save(this.store);
  }

  keys() {
    return Object.keys(this.store);
  }
}

module.exports = PersistentCache;
