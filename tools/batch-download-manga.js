const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const readline = require('readline');

const BASE_DIR = path.join(__dirname, '../assets/manga');

function sanitizeTitle(title) {
  return title
    .replace(/[^[\w\s-]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ /g, '_');
}

function sanitizeFolderName(name) {
  return name
    .replace(/[^[\w\s-]]/g, '')
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
    const fallback = await res.text();
    throw new Error(`[${label}] Non-JSON or error response (${res.status}): ${fallback.slice(0,200)}`);
  }
  return res.json();
}

// Fetch chapters and scanlation groups
async function getAllChapterData(mangaUuid) {
  const chapters = [];
  const includedGroups = {};
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://api.mangadex.org/chapter?manga=${mangaUuid}&translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=${offset}&includes[]=scanlation_group`;
    const json = await fetchJsonSafe(url, 'getAllChapterData');

    if (!json.data || !json.data.length) break;

    // Populate scanlation group names
        if (Array.isArray(json.included)) {
      json.included.forEach(item => {
        if (item.type === 'scanlation_group' && item.attributes?.name) {
          includedGroups[item.id] = item.attributes.name;
        }
      });
    }

    // Map each chapter to its scanlation group
    json.data.forEach(ch => {
      const number = ch.attributes.chapter || '0';
      const rel = (ch.relationships || []).find(r => r.type === 'scanlation_group');
      const groupId = rel?.id;
      const groupName = groupId ? (includedGroups[groupId] || 'Unknown Scanlator') : 'Unknown Scanlator';
      chapters.push({ id: ch.id, number, groupName });
    });

    offset += limit;
    if (offset >= (json.total || 0)) break;
  }

  return chapters;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
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
    if (!chapters.length) {
      console.error('No chapters found');
      process.exit(1);
    }

    const titleJson = await fetchJsonSafe(`https://api.mangadex.org/manga/${mangaUuid}`, 'getMangaTitle');
    const rawTitle = titleJson.data.attributes.title.en || Object.values(titleJson.data.attributes.title)[0];
    const safeTitle = sanitizeTitle(rawTitle);

    console.log(`📚 Found ${chapters.length} entries across scanlators for Manga: ${rawTitle}\n`);

    const map = new Map();
    chapters.forEach(c => {
      if (!map.has(c.number)) map.set(c.number, []);
      map.get(c.number).push(c);
    });

    const sortedNumbers = Array.from(map.keys()).sort((a,b) => parseFloat(a)-parseFloat(b));

    for (const number of sortedNumbers) {
      const entries = map.get(number);
      if (entries.length === 1) {
        const {id, groupName} = entries[0];
        console.log(`📥 Downloading chapter ${number} from [${groupName}]`);
        execSync(`node tools/download-chapter.js ${id}`, { stdio: 'inherit' });
        const defaultFolder = path.join(BASE_DIR, safeTitle, `ch-${number}`);
        const newFolder = path.join(BASE_DIR, safeTitle, `ch-${number}-${sanitizeFolderName(groupName)}`);
        if (fs.existsSync(defaultFolder)) fs.renameSync(defaultFolder, newFolder);
      } else {
        console.log(`\n🚩 Chapter ${number} available from:`);
        entries.forEach((c,i) => console.log(` [${i+1}] ${c.groupName}`));
        console.log(' [a] all\n');
        const ans = await prompt(`Select option for chapter ${number} (number or a): `);
        let toDownload = [];
        if (ans.toLowerCase() === 'a') {
          toDownload = entries;
        } else {
          const idx = parseInt(ans,10)-1;
          if (!entries[idx]) {
            console.warn(`Invalid choice, skipping chapter ${number}`);
            continue;
          }
          toDownload = [entries[idx]];
        }
        for (const {id, groupName} of toDownload) {
          console.log(`📥 Downloading chapter ${number} from [${groupName}]`);
          execSync(`node tools/download-chapter.js ${id}`, { stdio: 'inherit' });
          const defaultFolder = path.join(BASE_DIR, safeTitle, `ch-${number}`);
          const newFolder = path.join(BASE_DIR, safeTitle, `ch-${number}-${sanitizeFolderName(groupName)}`);
          if (fs.existsSync(defaultFolder)) fs.renameSync(defaultFolder, newFolder);
        }
      }
      await sleep(750);
    }

    console.log('\n✅ Batch download complete.');
  } catch (err) {
    console.error('❌ Batch Failed:', err.message);
  }
})();
