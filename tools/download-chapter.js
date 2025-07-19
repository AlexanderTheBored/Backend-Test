// tools/download-chapter.js

const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const readline = require('readline');

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
  const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'MangaView CLI' } });
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

// Fetch all chapter entries with scanlation groups
async function getAllChapterData(mangaId) {
  const chapters = [];
  const includedGroups = {};
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `https://api.mangadex.org/chapter?manga=${mangaId}&translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=${offset}&includes[]=scanlation_group`;
    const json = await fetchJsonSafe(url, 'getAllChapterData');
    if (!json.data || !json.data.length) break;

    // collect scanlation group names
    if (Array.isArray(json.included)) {
      json.included.forEach(item => {
        if (item.type === 'scanlation_group' && item.attributes?.name) {
          includedGroups[item.id] = item.attributes.name;
        }
      });
    }

    // record chapter entries
    json.data.forEach(ch => {
      const num = ch.attributes.chapter || '0';
      const rel = (ch.relationships || []).find(r => r.type === 'scanlation_group');
      const gid = rel?.id;
      chapters.push({ id: ch.id, number: num, groupId: gid });
    });

    offset += limit;
    if (offset >= (json.total || 0)) break;
  }

  // fetch missing group names
  const missing = Array.from(new Set(chapters.map(c => c.groupId).filter(Boolean))).filter(id => !includedGroups[id]);
  for (const id of missing) {
    try {
      const grp = await fetchJsonSafe(`https://api.mangadex.org/group/${id}`, 'getScanlationGroup');
      includedGroups[id] = grp.data.attributes.name;
    } catch {
      includedGroups[id] = 'Unknown';
    }
  }

  // enrich entries
  return chapters.map(c => ({
    id:        c.id,
    number:    c.number,
    groupName: includedGroups[c.groupId] || 'Unknown'
  }));
}

(async () => {
  const args = process.argv.slice(2);
  let chapterId;

  if (args.length === 1 && /^[0-9a-fA-F\-]{36}$/.test(args[0])) {
    // direct chapter ID
    chapterId = args[0];
  } else if (args.length === 2) {
    // manga UUID + chapter number
    const [mangaUuid, chapNum] = args;
    const all = await getAllChapterData(mangaUuid);
    const matches = all.filter(c => parseFloat(c.number) === parseFloat(chapNum));
    if (!matches.length) {
      console.error(`❌ Chapter ${chapNum} not found for manga ${mangaUuid}`);
      process.exit(1);
    } else if (matches.length === 1) {
      chapterId = matches[0].id;
    } else {
      console.log(`\n🚩 Chapter ${chapNum} available from:`);
      matches.forEach((c,i) => console.log(` [${i+1}] ${c.groupName}`));
      console.log(' [a] all\n');
      const ans = await prompt(`Select scanlator (1-${matches.length} or a): `);
      let chosen = [];
      if (ans.toLowerCase() === 'a') {
        chosen = matches;
      } else {
        const idx = parseInt(ans,10) - 1;
        if (!matches[idx]) { console.error('❌ Invalid choice'); process.exit(1); }
        chosen = [matches[idx]];
      }
      // download all chosen
      for (const { id } of chosen) {
        chapterId = id;
        // fall through to download logic
      }
    }
  } else {
    console.error('Usage: node tools/download-chapter.js <chapter-id>');
    console.error('   or: node tools/download-chapter.js <manga-uuid> <chapter-number>');
    process.exit(1);
  }

  try {
    // fetch chapter info
    const meta = await fetchJsonSafe(`https://api.mangadex.org/chapter/${chapterId}`, 'getChapterInfo');
    const mangaId = meta.data.relationships.find(r=>r.type==='manga')?.id;
    let chapNum = meta.data.attributes.chapter || '1';
    const ah = await fetchJsonSafe(`https://api.mangadex.org/at-home/server/${chapterId}`, 'getAtHomeServer');
    const baseUrl = ah.baseUrl;
    const hash = ah.chapter.hash;
    const pages = ah.chapter.data;

    const mjson = await fetchJsonSafe(`https://api.mangadex.org/manga/${mangaId}`, 'getMangaTitle');
    const mangaTitle = mjson.data.attributes.title.en || Object.values(mjson.data.attributes.title)[0];
    const safe = sanitizeTitle(mangaTitle);

    const folder = path.join(BASE_DIR, safe, `ch-${chapNum}`);
    fs.mkdirSync(folder, { recursive: true });

    for (let i=0; i<pages.length; i++) {
      const fn = pages[i];
      const url = `${baseUrl}/data/${hash}/${fn}`;
      const ext = path.extname(fn);
      const dest = path.join(folder, `page-${String(i+1).padStart(3,'0')}${ext}`);
      console.log(`⬇️ Downloading page ${i+1}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      await new Promise((resolv, reject) => {
        const w = fs.createWriteStream(dest);
        res.body.pipe(w);
        res.body.on('end', resolv);
        res.body.on('error', reject);
      });
    }

    console.log(`✅ Downloaded ${pages.length} pages to ${folder}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
