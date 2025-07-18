const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_DIR = path.join(__dirname, '../assets/manga');

function sanitizeTitle(title) {
  return title.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim().replace(/ /g, '_');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJsonSafe(url, label = '') {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'MangaView CLI'
    }
  });

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    const fallback = await res.text();
    throw new Error(`[${label}] Non-JSON or error response (${res.status}):\n${fallback.slice(0, 200)}`);
  }

  return res.json();
}

// ✅ FIXED: now paginates with limit=100 and offset
async function getAllChapterIds(mangaUuid) {
  let chapters = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://api.mangadex.org/chapter?manga=${mangaUuid}&translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=${offset}`;
    const json = await fetchJsonSafe(url, 'getAllChapterIds');

    if (!json.data.length) break;

    chapters.push(...json.data.map(ch => ({
      id: ch.id,
      number: ch.attributes.chapter || '0'
    })));

    offset += limit;
    if (offset >= json.total) break;
  }

  return chapters;
}

async function getMangaTitle(mangaUuid) {
  const json = await fetchJsonSafe(`https://api.mangadex.org/manga/${mangaUuid}`, 'getMangaTitle');
  return json.data.attributes.title.en || Object.values(json.data.attributes.title)[0];
}

(async () => {
  const mangaUuid = process.argv[2];
  if (!mangaUuid) {
    console.error('Usage: node tools/batch-download-manga.js <manga-uuid>');
    process.exit(1);
  }

  try {
    const title = await getMangaTitle(mangaUuid);
    const safeTitle = sanitizeTitle(title);
    const chapterList = await getAllChapterIds(mangaUuid);

    console.log(`📚 Downloading all chapters of: ${title}`);
    console.log(`📦 Total chapters found: ${chapterList.length}\n`);

    for (const { id, number } of chapterList) {
      const chapterPath = path.join(BASE_DIR, safeTitle, `ch-${number}`);
      if (fs.existsSync(chapterPath)) {
        console.log(`⏩ Skipping chapter ${number} (already downloaded)`);
        continue;
      }

      try {
        console.log(`📥 Downloading chapter ${number}`);
        execSync(`node tools/download-chapter.js ${id}`, { stdio: 'inherit' });
      } catch (err) {
        console.warn(`⚠️ Skipped chapter ${number} (${id}) due to error:\n  ${err.message}`);
        continue;
      }

      await sleep(750); // avoid API hammering
    }

    console.log('\n✅ Batch download complete.');
  } catch (err) {
    console.error('❌ Batch Failed:', err.message);
  }
})();
