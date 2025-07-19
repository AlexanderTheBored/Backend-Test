// tools/mangadex-link.js

const { execSync } = require('child_process');
const readlineModule = require('readline');

const link = process.argv[2];
if (!link) {
  console.error('Usage: node tools/mangadex-link.js <mangadex-link>');
  process.exit(1);
}

const chapterMatch = link.match(/mangadex\.org\/chapter\/([a-f0-9\-]+)/);
const mangaMatch   = link.match(/mangadex\.org\/title\/([a-f0-9\-]+)/);

if (chapterMatch) {
  const chapterId = chapterMatch[1];
  console.log(`📥 Chapter Detected: ${chapterId}`);
  console.log(`⬇️ Downloading chapter now...`);
  execSync(`node tools/download-chapter.js ${chapterId}`, { stdio: 'inherit' });
  process.exit(0);
}

if (!mangaMatch) {
  console.error('❌ Invalid MangaDex link. Please use a chapter or manga URL.');
  process.exit(1);
}

const mangaId = mangaMatch[1];
console.log(`📚 Manga Detected: ${mangaId}`);

const rl = readlineModule.createInterface({ input: process.stdin, output: process.stdout });
console.log('\nWhat would you like to do?');
console.log('[1] Add to manga.json (and generate chapter folders)');
console.log('[2] Download a single chapter');
console.log('[3] Download all chapters');
console.log('[4] Do all: add, single download, and batch download');

rl.question('> ', choice => {
  switch (choice) {
    case '1':
      console.log(`🗃️ Adding manga to database...`);
      execSync(`node tools/generate-manga-json.js ${mangaId}`, { stdio: 'inherit' });
      console.log(`📂 Generating chapter folders...`);
      execSync(`node tools/generate-chapter-folders.js ${mangaId}`, { stdio: 'inherit' });
      rl.close();
      break;

    case '2': {
      // prompt for chapter number
      const rl2 = readlineModule.createInterface({ input: process.stdin, output: process.stdout });
      rl2.question('Enter chapter number: ', chap => {
        console.log(`⬇️ Downloading chapter ${chap}...`);
        execSync(`node tools/download-chapter.js ${mangaId} ${chap}`, { stdio: 'inherit' });
        rl2.close();
        rl.close();
      });
      break;
    }

    case '3':
      console.log(`⬇️ Starting batch download...`);
      execSync(`node tools/batch-download-manga.js ${mangaId}`, { stdio: 'inherit' });
      rl.close();
      break;

    case '4':
      console.log(`🗃️ Adding manga to database...`);
      execSync(`node tools/generate-manga-json.js ${mangaId}`, { stdio: 'inherit' });
      console.log(`⬇️ Starting batch download...`);
      execSync(`node tools/batch-download-manga.js ${mangaId}`, { stdio: 'inherit' });
      console.log(`📂 Generating chapter folders...`);
      execSync(`node tools/generate-chapter-folders.js ${mangaId}`, { stdio: 'inherit' });
      rl.close();
      break;

    default:
      console.error('❌ Invalid choice. Please select 1, 2, 3, or 4.');
      rl.close();
      process.exit(1);
  }
});
