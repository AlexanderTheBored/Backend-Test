# MangaView

A simple web-based manga library and reader with animated book cards, cover images, and chapter navigation.

---

## 📁 Project Structure

```
Book animation test/
│
├── index.html
├── mangareader.html
├── data/
│   └── manga.json
├── assets/
│   ├── covers/
│   │   └── [id].jpg / [id].png
│   └── manga/
│       └── [folder]/
│           └── ch-[chapter]/
│               └── page-001.jpg / page-001.png
├── components/
│   ├── book-card/
│   │   ├── book-card.js
│   │   ├── book-card.css
│   ├── logo/
│   │   └── logo.css
├── styles/
│   └── main.css
├── dev-tools/
│   └── admin.html
└── commands-reference.txt
```

---

## 📄 File Descriptions

### `index.html`
- Main landing page showing a grid of manga cards.
- Loads manga data from `data/manga.json`.
- Uses animated book cards (`book-card.js` and `book-card.css`).
- Clicking a card opens the reader for that manga.

### `mangareader.html`
- Manga reading interface.
- Loads chapter images from `/assets/manga/[folder]/ch-[chapter]/page-XXX.jpg` or `.png`.
- Provides navigation for chapters (Next, Previous, and chapter select).
- Displays manga title and chapter number.

### `data/manga.json`
- Contains metadata for all manga in the library.
- Each entry includes: `id`, `slug`, `title`, `authors`, `chapters`, `coverExt`, `folder`, etc.

### `assets/covers/`
- Contains cover images for each manga.
- Filenames match the manga `id` and use the extension specified by `coverExt` (`jpg` or `png`).

### `assets/manga/`
- Contains folders for each manga, named by their `folder` property in `manga.json`.
- Each manga folder contains chapter subfolders (`ch-1`, `ch-2`, ...) with images named `page-001.jpg`, `page-002.jpg`, etc.

### `components/book-card/book-card.js`
- Handles book card animations (3D tilt).
- Loads cover images with fallback logic.
- Exports `initBookCards` and `openReader`.

### `components/book-card/book-card.css`
- Styles for the book card grid and animations.

### `components/logo/logo.css`
- Styles for the animated logo in the header.

### `styles/main.css`
- Global styles for the site.

### `dev-tools/admin.html`
- Utility page for generating CLI commands from MangaDex links.

### `commands-reference.txt`
- Contains CLI commands and usage examples for downloading manga and covers.
- **Refer to this file for all supported CLI commands and automation tips.**

---

## 📦 Downloading Manga

This project uses **CLI tools** to download manga chapters and covers.  
- Downloaded images should be placed in the appropriate folders under `assets/manga/[folder]/ch-[chapter]/`.
- Covers should be placed in `assets/covers/` with the correct filename and extension.
- **See `commands-reference.txt` for command usage and automation tips.**

---

## 🚀 Usage

1. **Add manga metadata** to `data/manga.json`.
2. **Download manga chapters and covers using CLI tools** and place them in the correct folders.
3. **Open `index.html`** in your browser (preferably via a local server for best results).
4. **Click a manga card** to start reading!

---

## 🛠️ Development Notes

- All scripts and styles are loaded locally.
- For best results, use VS Code's Live Server or any local web server.
- If images or manga do not load, check the browser console for errors and verify file paths and naming conventions.
- See `KNOWN_ISSUES.md` for troubleshooting ES module loading and browser compatibility.

---

## 📢 Credits

Created by AlexanderTheBored.  
Inspired by manga reader apps and animated
