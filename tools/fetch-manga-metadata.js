#!/usr/bin/env node
// tools/fetch-manga-metadata.js
// Usage: node tools/fetch-manga-metadata.js <MANGA_UUID>

const fs   = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const DATA_PATH  = path.join(__dirname, '../data/manga.json');
const USER_AGENT = 'MangaView CLI';

function getNextId(list) {
  const ids = list.map(m => parseInt(m.id, 10));
  const next = ids.length ? Math.max(...ids) + 1 : 1;
  return String(next).padStart(6, '0');
}

async function main() {
  const [mangaUuid] = process.argv.slice(2);
  if (!mangaUuid) {
    console.error('Usage: fetch-manga-metadata.js <MANGA_UUID>');
    process.exit(1);
  }

  // Fetch from MD API with includes for author, artist, cover_art
  const url = new URL(`https://api.mangadex.org/manga/${mangaUuid}`);
  ['author','artist','cover_art'].forEach(rel => url.searchParams.append('includes[]', rel));

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT }
  });
  if (!res.ok) {
    console.error(`Error ${res.status} fetching manga: ${res.statusText}`);
    process.exit(1);
  }

  const body = await res.json();
  const { data, included } = body;
  const attrs = data.attributes;

  // Basic fields
  const title       = attrs.title.en || Object.values(attrs.title)[0] || 'Untitled';
  const description = attrs.description.en || 'No description.';
  const status      = attrs.status;                 // ongoing / completed / ...
  const tags        = attrs.tags.map(t => t.attributes.name.en).filter(Boolean);

  // Gather author & artist names from includes
  const authors = included
    .filter(r => r.type === 'author')
    .map(r => r.attributes.name);
  const artists = included
    .filter(r => r.type === 'artist')
    .map(r => r.attributes.name);

  // Cover filename
  const cover = included.find(r => r.type === 'cover_art');
  const coverFile = cover?.attributes.fileName || '';

  // Read & update local JSON
  const list = fs.existsSync(DATA_PATH)
    ? JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    : [];

  let rec = list.find(m => m.mdUuid === mangaUuid);
  if (!rec) {
    rec = { id: getNextId(list), mdUuid: mangaUuid };
    list.push(rec);
  }

  rec.title       = title;
  rec.description = description;
  rec.status      = status;
  rec.genres      = tags;
  rec.authors     = authors;
  rec.artists     = artists;
  rec.coverFile   = coverFile;

  fs.writeFileSync(DATA_PATH, JSON.stringify(list, null, 2) + '\n');
  console.log(`→ [${rec.id}] ${title} metadata saved.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
