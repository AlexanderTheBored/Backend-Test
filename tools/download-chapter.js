// tools/download-chapter.js

const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { pipeline } = require('stream/promises');

const BASE_DIR = path.join(__dirname, '../assets/manga');

function sanitizeTitle(title) {
  return title
    .replace(/[^\w\s-]/g, '')   // remove special chars
    .replace(/\s+/g, ' ')       // normalize all whitespace
    .trim()
    .replace(/ /g, '_');        // convert to underscores
}

async function getChapterInfo(chapterId) {
  const url = `https://api.mangadex.org/chapter/${chapterId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch chapter metadata');
  const json = await res.json();

  const mangaId = json.data.relationships.find(r => r.type === 'manga')?.id;
  const chapter = json.data.attributes.chapter || '0';
  const title = json.data.attributes.title || `Chapter ${chapter}`;

  return { mangaId, chapterNumber: chapter, title };
}

async function getAtHomeServer(chapterId) {
  const url = `https://api.mangadex.org/at-home/server/${chapterId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch at-home server info');
  return res.json();
}

async function getMangaTitle(mangaId) {
  const url = `https://api.mangadex.org/manga/${mangaId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch manga title');
  const json = await res.json();
  return json.data.attributes.title.en || Object.values(json.data.attributes.title)[0];
}

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  await pipeline(res.body, fs.createWriteStream(destPath));
}

(async () => {
  const chapterId = process.argv[2];
  if (!chapterId) {
    console.error('Usage: node tools/download-chapter.js <chapter-id>');
    process.exit(1);
  }

  try {
    const { mangaId, chapterNumber } = await getChapterInfo(chapterId);
    const { baseUrl, chapter } = await getAtHomeServer(chapterId);
    const mangaTitle = await getMangaTitle(mangaId);
    const safeTitle = sanitizeTitle(mangaTitle); // 🔧 consistent folder name

    const folderPath = path.join(BASE_DIR, safeTitle, `ch-${chapterNumber}`);
    fs.mkdirSync(folderPath, { recursive: true });

    const files = chapter.data;
    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const url = `${baseUrl}/data/${chapter.hash}/${filename}`;
      const ext = path.extname(filename);
      const dest = path.join(folderPath, `page-${String(i + 1).padStart(3, '0')}${ext}`);
      console.log(`⬇️ Downloading page ${i + 1} to ${dest}`);
      await downloadImage(url, dest);
    }

    console.log(`✅ Download complete: ${files.length} pages saved to ${folderPath}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
