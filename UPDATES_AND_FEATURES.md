FEATURE: Update manga reader navigation (Previous/Next behavior)
---------------------------------------------------------------

Description:
-------------
Improve the navigation UX in the manga reader by handling edge cases. When the user is on the **first** page of a chapter, clicking **Previous** should redirect them to the homepage (`index.html`). When on the **last** page, **Next** should do nothing and appear visually disabled.

Cause:
-------
Default navigation assumes all pages are available and does not handle start/end bounds explicitly, leading to poor UX.

Steps to Reproduce:
---------------------
1. Open the reader and navigate to the first or last page of a chapter.
2. Click Previous or Next, respectively.

Expected:
----------
- On the first page: clicking Previous redirects to the homepage.
- On the last page: clicking Next does nothing and looks disabled.

Actual:
---------
- Both links do nothing when on the first or last page—no visual or behavioral feedback is provided.

Fix:
-----
**In HTML:**

```html
<a id="prev-btn" href="#">Previous</a>
<a id="next-btn" href="#">Next</a>
```

**In JavaScript:**

```js
// Assume `pages` is an array of page URLs and `currentIndex` is the zero-based page position
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

if (currentIndex === 0) {
  // First page: go home
  prevBtn.href = 'index.html';
} else {
  prevBtn.href = pages[currentIndex - 1];
}

if (currentIndex === pages.length - 1) {
  // Last page: disable next
  nextBtn.removeAttribute('href');
  nextBtn.classList.add('disabled'); // style via CSS: .disabled { opacity: 0.5; pointer-events: none; }
} else {
  nextBtn.href = pages[currentIndex + 1];
}
```

Status:
--------
Closed – implemented in the reader template. “Previous” now redirects home on the first page; “Next” is visually disabled on the last page.

FEATURE: Add pagination to index view (limit 25 manga per page)
---------------------------------------------------------------

Description:
-------------
Add pagination to the homepage (index.html) to limit the number of manga entries displayed per page to 25. This improves performance and usability, especially as the manga library grows.

Cause:
-------
All manga entries are currently rendered on a single page, which can lead to long load times, sluggish UI, and poor UX on mobile.

Steps to Reproduce:
---------------------
1. Add more than 25 manga to the library.
2. Open index.html and scroll through the entire list.

Expected:
----------
Only 25 entries should be shown at a time, with pagination controls (e.g., “Previous”, “Next”) available for navigation.

Actual:
---------
All entries are rendered at once with no pagination or limit, creating a heavy DOM and poor performance.

Fix:
-----
- Update the index rendering logic to slice the manga list into pages of 25.
- Add pagination buttons to navigate between pages.
- Use query parameters or URL hash (e.g. `?page=2`) to track current page.
- Optionally add a visual indicator (e.g., “Page 1 of X”).

**Example JavaScript logic:**

```js
const itemsPerPage = 25;
const urlParams = new URLSearchParams(window.location.search);
const currentPage = parseInt(urlParams.get('page')) || 1;

const start = (currentPage - 1) * itemsPerPage;
const end = start + itemsPerPage;

// Assume mangaList is an array of all manga metadata
const pageItems = mangaList.slice(start, end);

// Render pageItems into the DOM
renderMangaCards(pageItems);

// Generate pagination controls
const totalPages = Math.ceil(mangaList.length / itemsPerPage);
const paginationContainer = document.getElementById('pagination');
paginationContainer.innerHTML = '';

if (currentPage > 1) {
  const prev = document.createElement('a');
  prev.href = `?page=${currentPage - 1}`;
  prev.textContent = 'Previous';
  paginationContainer.appendChild(prev);
}

if (currentPage < totalPages) {
  const next = document.createElement('a');
  next.href = `?page=${currentPage + 1}`;
  next.textContent = 'Next';
  paginationContainer.appendChild(next);
}
```

Status:
--------
Closed – pagination now fully supports 24-item slices per page with top and bottom navigation bars, URL syncing, and mobile/desktop responsiveness. The layout is intentionally kept divisible by common column counts (2, 3, 4) for grid consistency.

FEATURE: Add manga detail page between cover and chapter view
-------------------------------------------------------------

Description:
-------------
Introduce a dedicated intermediate page between clicking a manga cover and entering the reader. This detail view should display the manga’s title, genres, description, and a list of available chapters.

Cause:
-------
Users currently go directly from the cover to reading, with no context about what they’re reading. This breaks user flow and hides useful metadata like genre or chapter list.

Steps to Reproduce:
---------------------
1. Open index.html and click on any manga cover.
2. Observe that the user is taken directly into the reader without a summary or metadata view.

Expected:
----------
Clicking a cover should show a full details view for the selected manga, including:
- Title
- Genre tags
- Description (if available)
- Chapter list (in order, clickable)

Actual:
---------
Covers link directly into the first chapter with no intermediary step or metadata display.

Fix:
-----
- Add a new HTML file (e.g., `details.html`) to serve as the detail view template.
- Pass the manga ID via URL (e.g., `details.html?id=000025`) when clicking the cover.
- Fetch full metadata for that manga (title, genres, chapters, etc.).
- Render those fields on the detail page.
- Each chapter in the list should be a clickable link to its reader view.

**Example JavaScript for details.html:**

```js
const params = new URLSearchParams(window.location.search);
const mangaId = params.get('id');

// Fetch metadata (from local JSON or API)
fetch('/data/manga.json')
  .then(res => res.json())
  .then(data => {
    const manga = data.find(m => m.id === mangaId);
    if (!manga) return;

    document.getElementById('title').textContent = manga.title;
    document.getElementById('genres').textContent = manga.genres.join(', ');
    document.getElementById('description').textContent = manga.description;

    const chapterList = document.getElementById('chapters');
    manga.chapters.forEach(ch => {
      const link = document.createElement('a');
      link.href = `/reader.html?id=${mangaId}&ch=${ch.number}`;
      link.textContent = `Chapter ${ch.number}`;
      chapterList.appendChild(link);
    });
  });
```

**Example HTML snippet:**

```html
<h1 id="title"></h1>
<p id="genres"></p>
<p id="description"></p>
<div id="chapters"></div>
```

Status:
--------
Closed – the detail page is now implemented. Clicking a cover leads to a summary page with title, genres, description, and chapter links. The reader can be accessed from this page, providing a better user experience and context before reading.

FEATURE: Add CLI tool to update all manga entries
--------------------------------------------------

Description:
-------------
Create a CLI utility to scan all locally tracked manga against their source (e.g., MangaDex) and check for new chapter releases. The tool should list updates clearly in the console and optionally allow downloading them.

Cause:
-------
Currently, updates must be manually checked or triggered one-by-one. This doesn't scale well as the library grows.

Steps to Reproduce:
---------------------
1. Run the script with a command like: `node update-all.js`
2. Tool checks each series in the local library.
3. Compare stored chapters to source API data.
4. Show any new chapters with option to fetch.

Expected:
----------
- List of manga with new chapters available.
- Option to download selected/all updates via CLI.
- Clear feedback for which manga are already up-to-date.

Actual:
---------
No CLI exists for this yet — updates must be triggered per-series, manually or with separate scripts.

Fix:
-----
- Iterate over all locally indexed manga (from metadata JSON or folder structure).
- For each, fetch latest chapter list from source (e.g., MangaDex API).
- Compare with local chapters.
- Print changes in a clear table:
  - ✅ Up-to-date
  - ⬆️ New chapters: [list of chapter numbers]
- Add `--download` flag or prompt to pull new chapters directly.

**Example CLI output:**

```bash
[✔] Solo Leveling – Up-to-date
[↑] Chainsaw Man – New chapters: 148, 149
[↑] Kaguya-sama – New chapter: 276

Download all new chapters? (y/n):
```

Status:
--------
Open – CLI design and implementation pending. May require optional config for group preference and language filtering.

FEATURE: Add Temporary Download Folder for Chapter Updates  
------------------------------------------------------------

Description:  
-------------  
Implement a temporary download directory to stage new chapter pages before moving them into the main `assets/manga/` directory. This ensures that ongoing updates (downloads or syncs) do not interfere with live site usage or trigger page reloads due to incomplete or changing files.

Cause:  
-------  
Currently, new chapters are downloaded directly into the live `assets/manga/` directory. This can cause issues while browsing, such as missing images, layout breaks, or infinite reloads when the site detects partially downloaded content.

Steps to Reproduce:  
---------------------  
1. Begin downloading a new chapter directly into `assets/manga/{title}/ch-{chapter}/`.  
2. Open the reader on that chapter.  
3. Site reloads repeatedly as files appear incrementally or inconsistently.  

Expected:  
----------  
- New chapters are downloaded into a temporary staging directory (e.g., `.tmp_downloads/`).  
- Only once the download is complete and verified, the folder is moved or copied into `assets/manga/`.  
- Live site remains stable and unaffected during download operations.  

Actual:  
---------  
- Files are downloaded directly into the live directory.  
- Causes reload loops or broken rendering while downloads are in progress.  

Fix:  
-----  
- Modify the download script to target `.tmp_downloads/` initially.  
- Validate that all expected pages are present (based on API metadata).  
- Once validated, move the complete folder to `assets/manga/{title}/ch-{chapter}/`.  
- Clean up temp folders after move to avoid clutter.  
- Optionally log the operation with timestamp and status.

**Example Workflow:**  

```bash
→ Downloading Chapter 21 of "Blue Lock"...
→ Staging to .tmp_downloads/Blue Lock/ch-21/
→ Download complete: 26 pages
→ Moving to assets/manga/Blue Lock/ch-21/
→ Cleanup successful
[✔] Blue Lock ch-21 ready
```

Status:
--------
Open – Needs implementation in existing chapter download logic. May also require small update to the reader's file access logic if temp files ever become visible.

FEATURE: Simplify local development setup (Node.js & dependencies)
-----------------------------------------------------------------

Description:
-------------
Automate and streamline the process of getting MangaView up and running locally so new contributors can start coding with one command, rather than wrestling with manual installs, PATH tweaks, and execution-policy issues.

Cause:
-------
Onboarding requires manually installing Node.js, configuring environment variables, adjusting PowerShell execution policies, or installing Docker—steps that are error-prone and frustrating.

Steps to Reproduce:
---------------------
1. Clone the repo.  
2. Run `npm ci` in a fresh shell.  
3. Encounter “node not recognized” or “running scripts is disabled” errors.  
4. Spend time installing/removing/reinstalling Node, updating PATH, tweaking policies, or installing Docker.

Expected:
----------
A single `tools/setup-dev.ps1` (or `setup-dev.sh`) call, or a Docker/DevContainer option, to install Node (if missing), configure the environment, and run `npm ci`—so the code “just works.”

Actual:
---------
Multiple OS-specific steps are required: download/install Node, add to PATH, enable execution policy, install Docker or Chocolatey, restart shells, etc., before anything builds.

Fix:
-----
- Provide a `tools/setup-dev.ps1` (Windows) and `tools/setup-dev.sh` (macOS/Linux) that:
  1. Installs Node.js LTS if missing.  
  2. Refreshes the environment.  
  3. Runs `npm ci`.  
- Include a `docker-compose.yml` that spins up a Node:22-alpine container, mounts the workspace, and auto-runs `npm ci && npm run dev`.  
- Add a VS Code Dev Container (`.devcontainer/devcontainer.json`) preconfigured with Node and a post-create command of `npm ci`.

**Example `tools/setup-dev.ps1`:**
```powershell
Write-Host "Setting up MangaView dev environment..." -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Node.js LTS via Chocolatey..."
  choco install nodejs-lts -y
  Write-Host "Refreshing environment..."
  & refreshenv
}
Write-Host "Installing npm packages..."
npm.cmd ci
Write-Host "Done! Run `npm run dev` to start the app." -ForegroundColor Green
```

**Example `docker-compose.yml`:**
```yaml
version: "3.8"
services:
  dev:
    image: node:22-alpine
    volumes:
      - .:/app
    working_dir: /app
    command: sh -c "npm ci && npm run dev"
    ports:
      - "3000:3000"
```

**Example `.devcontainer/devcontainer.json`:**
```json
{
  "name": "MangaView Dev",
  "image": "node:22-alpine",
  "workspaceFolder": "/app",
  "extensions": ["ms-vscode.vscode-node-azure-pack"],
  "postCreateCommand": "npm ci"
}
```

Status:
--------
Open – Scripts and container definitions to be added to `tools/`, `.devcontainer/`, and root directory.
 