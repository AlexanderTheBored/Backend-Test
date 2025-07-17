// tools/mangadex-link.js

const { execSync } = require('child_process');

const link = process.argv[2];
if (!link) {
  console.error('Usage: node tools/mangadex-link.js <mangadex-link>');
  process.exit(1);
}

const chapterMatch = link.match(/mangadex\.org\/chapter\/([a-f0-9\-]+)/);
const mangaMatch = link.match(/mangadex\.org\/title\/([a-f0-9\-]+)/);

if (chapterMatch) {
  const chapterId = chapterMatch[1];
  console.log(`📥 Chapter Detected: ${chapterId}`);
  console.log(`⬇️ Downloading chapter now...`);
  execSync(`node tools/download-chapter.js ${chapterId}`, { stdio: 'inherit' });
  process.exit(0);
}

if (mangaMatch) {
  const mangaId = mangaMatch[1];
  console.log(`📚 Manga Detected: ${mangaId}`);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\nWhat would you like to do?');
  console.log('[1] Add to manga.json only');
  console.log('[2] Download all chapters');
  console.log('[3] Both');

  readline.question('> ', (choice) => {
    if (choice === '1' || choice === '3') {
      console.log(`🗃️ Adding manga to database...`);
      execSync(`node tools/generate-manga-json.js ${mangaId}`, { stdio: 'inherit' });
    }
    if (choice === '2' || choice === '3') {
      console.log(`⬇️ Starting batch download...`);
      execSync(`node tools/batch-download-manga.js ${mangaId}`, { stdio: 'inherit' });
    }
    readline.close();
  });
} else {
  console.error('❌ Invalid MangaDex link. Please use a chapter or manga URL.');
  process.exit(1);
}
