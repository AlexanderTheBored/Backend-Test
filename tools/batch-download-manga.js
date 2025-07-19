// batch-download-manga.js
// This script fetches all chapters for a given manga and downloads them in batches.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const readline = require('readline');
let preferredGroupId = null;
let downloadAll = false;
const BASE_DIR = path.join(__dirname, '../assets/manga');

function sanitizeTitle(title) {
  return title
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '_');
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
  const ct = res.headers.get('content-type') || '';
  if (!res.ok || !ct.includes('application/json')) {
    const text = await res.text();
    throw new Error(`[${label}] Response error (${res.status}): ${text.slice(0,200)}`);
  }
  return res.json();
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// Fetch and resolve all chapters + scanlation group names
async function getAllChapterData(mangaUuid) {
  const chapters = [];
  const groups   = {};
  let offset = 0, limit = 100;

  while (true) {
    const url = `https://api.mangadex.org/chapter?manga=${mangaUuid}&translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=${offset}&includes[]=scanlation_group`;
    const json = await fetchJsonSafe(url, 'getAllChapterData');
    if (!json.data.length) break;

    if (Array.isArray(json.included)) {
      json.included.forEach(item => {
        if (item.type === 'scanlation_group') {
          groups[item.id] = item.attributes.name;
        }
      });
    }

    json.data.forEach(ch => {
      const num = ch.attributes.chapter || '0';
      const rel = (ch.relationships || []).find(r => r.type === 'scanlation_group');
      const gid = rel?.id;
      chapters.push({ id: ch.id, number: num, groupId: gid });
    });

    offset += limit;
    if (offset >= (json.total || 0)) break;
  }

  // Fetch missing group names via /group/{id}
  const missing = [...new Set(chapters.map(c => c.groupId).filter(Boolean))].filter(id => !groups[id]);
  for (const id of missing) {
    try {
      const grp = await fetchJsonSafe(`https://api.mangadex.org/group/${id}`, 'getScanlationGroup');
      groups[id] = grp.data.attributes.name;
    } catch {
      groups[id] = 'Unknown';
    }
  }

return chapters.map(c => ({
  id:        c.id,
  number:    c.number,
  groupId:   c.groupId,
  groupName: c.groupId == null
    ? 'No Scanlator'
    : (groups[c.groupId] || 'Unknown Scanlator')
}));
}

(async () => {
  const mangaUuid = process.argv[2];
  if (!mangaUuid) {
    console.error('Usage: node tools/batch-download-manga.js <manga-uuid>');
    process.exit(1);
  }

  try {
    const chapters = await getAllChapterData(mangaUuid);
    if (!chapters.length) throw new Error('No chapters found');

    const titleJson = await fetchJsonSafe(`https://api.mangadex.org/manga/${mangaUuid}`, 'getMangaTitle');
    const rawTitle  = titleJson.data.attributes.title.en || Object.values(titleJson.data.attributes.title)[0];
    const safeTitle = sanitizeTitle(rawTitle);

    console.log(`📚 Found ${chapters.length} entries for Manga: ${rawTitle}\n`);

    // Group by chapter number
    const map = new Map();
    chapters.forEach(c => {
      if (!map.has(c.number)) map.set(c.number, []);
      map.get(c.number).push(c);
    });

    const sorted = Array.from(map.keys()).sort((a, b) => parseFloat(a) - parseFloat(b));

    for (const number of sorted) {
      const entries = map.get(number);
      if (entries.length === 1) {
console.log(`📥  Downloading chapter ${number}`);
        execSync(`node tools/download-chapter.js ${entries[0].id}`, { stdio: 'inherit' });

      } else {
        // apply your single preferred scanlator (or “all”) to every chapter
        let toDownload;

        if (downloadAll) {
          toDownload = entries;
        } else if (preferredGroupId) {
          const preferred = entries.filter(c => c.groupId === preferredGroupId);
          if (preferred.length) {
            toDownload = preferred;
          }
        }

        // only ask if we still have no valid selection
        if (!toDownload) {
          console.log(`\n🚩 Chapter ${number} available from:`);
          entries.forEach((c, i) =>
            console.log(` [${i+1}] ${c.groupName}`)
          );
          console.log(' [a] all\n');

          const ans = await prompt(
            `Select option for chapter ${number} (1-${entries.length} or a): `
          );

          if (ans.toLowerCase() === 'a') {
            downloadAll = true;
            toDownload   = entries;
          } else {
            const idx    = parseInt(ans, 10) - 1;
            const choice = entries[idx];
            preferredGroupId = choice.groupId;
            toDownload       = [choice];
          }
        }

        // download the chosen entries
        toDownload.forEach(({ id }) => {
          console.log(`📥  Downloading chapter ${number}`);
          execSync(`node tools/download-chapter.js ${id}`, { stdio: 'inherit' });
        });

      await sleep(750);
    }
}
    console.log('\n✅ Batch download complete.');
  } catch (err) {
    console.error('❌ Batch Failed:', err.message);
  }
})();
