// /tools/generate-manga-json.js

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const DATA_PATH = path.join(__dirname, '../data/manga.json');
const COVER_PATH = path.join(__dirname, '../assets/covers/');

const USE_THUMBNAILS = false; // set to false to download full size covers
const THUMBNAIL_SIZE = 256;  // valid values: 256 or 512

// Load existing manga.json or initialize empty
let mangaData = [];
if (fs.existsSync(DATA_PATH)) {
  mangaData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

// Get next available 6-digit ID
function getNextId() {
  const ids = mangaData.map(m => parseInt(m.id));
  const next = ids.length ? Math.max(...ids) + 1 : 1;
  return String(next).padStart(6, '0');
}

// Download cover from MangaDex CDN using stream pipeline
async function downloadCover(uuid, filename) {
  const coverApi = `https://api.mangadex.org/cover?manga[]=${uuid}`;
  const resApi = await fetch(coverApi);
  const json = await resApi.json();

  if (!json.data || json.data.length === 0) {
    console.warn(`⚠️ No cover found for ${uuid}. Skipping cover download.`);
    return null;
  }

  const sorted = json.data.sort((a, b) => {
    const aVol = parseFloat(a.attributes.volume) || 0;
    const bVol = parseFloat(b.attributes.volume) || 0;
    return bVol - aVol;
  });

  const fileName = sorted[0].attributes.fileName;
  const ext = path.extname(fileName).slice(1);
  const effectiveExt = USE_THUMBNAILS ? 'jpg' : ext;
  const localFile = `${filename}.${effectiveExt}`;
  const dest = path.join(COVER_PATH, localFile);

  const url = USE_THUMBNAILS
    ? `https://uploads.mangadex.org/covers/${uuid}/${fileName}.${THUMBNAIL_SIZE}.jpg`
    : `https://uploads.mangadex.org/covers/${uuid}/${fileName}`;

  console.log(`📁 Fetching cover from: ${url}`);

  if (fs.existsSync(dest)) {
    console.log(`📦 Cover ${localFile} already exists, skipping download.`);
    return effectiveExt;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download cover: ${response.status}`);

  await pipeline(response.body, fs.createWriteStream(dest));

  return effectiveExt;
}

// Fetch manga metadata from MangaDex
async function fetchManga(uuid) {
  const res = await fetch(`https://api.mangadex.org/manga/${uuid}?includes[]=author&includes[]=artist&includes[]=cover_art`);
  const json = await res.json();
  const data = json.data;
  const attributes = data.attributes;

  const title = attributes.title.en || Object.values(attributes.title)[0];
  const description = attributes.description.en || Object.values(attributes.description)[0] || '';
  const status = attributes.status;
  const genres = attributes.tags.map(tag => tag.attributes.name.en);

  const authorRelation = data.relationships.find(r => r.type === 'author');
  const author = authorRelation?.attributes?.name || 'Unknown';

  const chapterCount = await fetchChapterCount(uuid);

  return {
    title,
    description,
    status,
    genres,
    author,
    chapterCount
  };
}

// Fetch estimated chapter count
async function fetchChapterCount(uuid) {
  const res = await fetch(`https://api.mangadex.org/chapter?manga=${uuid}&limit=1&order[chapter]=desc`);
  const json = await res.json();
  const chapterStr = json.data[0]?.attributes?.chapter;
  const chapter = parseFloat(chapterStr);
  return isNaN(chapter) ? 0 : Math.floor(chapter);
}

// Main CLI Logic
(async () => {
  const uuid = process.argv[2];
  if (!uuid) {
    console.error('Usage: node generate-manga-json.js <mangaDex UUID>');
    process.exit(1);
  }

  const existing = mangaData.find(m => m.uuid === uuid);
  if (existing) {
    console.log(`⚠️  UUID already exists as ID ${existing.id} (${existing.title}), skipping.`);
    process.exit(0);
  }

  const id = getNextId();
  const slug = uuid;

  try {
    const meta = await fetchManga(uuid);
    const ext = await downloadCover(uuid, id) || 'jpg';

    mangaData.push({
      id,
      uuid,
      slug: slug,
      title: meta.title,
      authors: [meta.author],
      status: meta.status,
      chapters: meta.chapterCount,
      description: meta.description,
      genres: meta.genres,
      coverExt: ext,
      added: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    });

    fs.writeFileSync(DATA_PATH, JSON.stringify(mangaData, null, 2));
    console.log(`✅ Added ${meta.title} as ID ${id}`);
  } catch (err) {
    console.error('❌ Failed to fetch or save manga:', err.message);
  }
})();
