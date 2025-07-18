// tools/generate-chapter-folders.js

const fs = require('fs');
const path = require('path');

const mangaJsonPath = path.join(__dirname, '../data/manga.json');
const mangaAssetsPath = path.join(__dirname, '../assets/manga');

const mangaList = JSON.parse(fs.readFileSync(mangaJsonPath, 'utf-8'));
const target = process.argv[2]; // slug or uuid

function extractChapterFolders(titleDir) {
  const fullPath = path.join(mangaAssetsPath, titleDir);
  if (!fs.existsSync(fullPath)) return [];

  return fs
    .readdirSync(fullPath, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('ch-'))
    .map(d => d.name.replace('ch-', ''))
    .sort((a, b) => parseFloat(a) - parseFloat(b));
}

let updated = false;

for (const manga of mangaList) {
  if (!target || manga.slug === target || manga.uuid === target) {
    const safeTitle = manga.title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/ /g, '_');

    const folders = extractChapterFolders(safeTitle);
    manga.chapterFolders = folders;
    manga.chapters = folders.length;
    updated = true;

    console.log(`✅ Updated: ${manga.title} → ${folders.length} chapter folder(s)`);
  }
}

if (updated) {
  fs.writeFileSync(mangaJsonPath, JSON.stringify(mangaList, null, 2));
  console.log('📝 manga.json saved.');
} else {
  console.log('⚠️ No matching manga found. Use slug or uuid as argument.');
}
