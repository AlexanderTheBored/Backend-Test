BUG: book-card.js throws "Unexpected token 'export'" in browser

Description:
-------------
The browser throws the following error when loading book-card.js:
  Uncaught SyntaxError: Unexpected token 'export'

Cause:
-------
The file uses ES module syntax (`export`, `import`) but is loaded via a classic <script> tag without `type="module"`.

Steps to Reproduce:
---------------------
1. Include book-card.js using:
     <script src="/components/book-card/book-card.js" defer></script>
2. Open the page in the browser.

Expected:
----------
The script initializes properly and exposes exported functions.

Actual:
---------
The browser fails immediately with a syntax error at line 1.

Fix:
-----
Use ES module loading syntax:
  <script type="module">
    import { initBookCards, openReader } from '/components/book-card/book-card.js';
    // your logic...
  </script>

Also remove any previous non-module <script> tags referencing the same file.

Status:
--------
Open – Needs either:
  - consistent use of `type="module"` in HTML
  - OR fallback to classic syntax (remove exports) if ES modules aren't desired

BUG: Chapters 1–3 display no manga pages in reader

Description:
-------------
Chapters 1 through 3 of the manga reader load with no pages, resulting in a blank view and no indication of missing content.

Cause:
-------
Those chapters have no source data from MangaDex, and the reader does not detect or handle the absence of page URLs.

Steps to Reproduce:
---------------------
1. Open MangaView and select the target series (e.g. “Naruto, or Bleach”).
2. Click on Chapter 1 (or 2 or 3) in the chapter list.
3. Observe that the page viewer area remains empty with no error message.

Expected:
----------
Each chapter should either render its scanned pages or display a clear placeholder/message indicating “No scans available for this chapter.”

Actual:
---------
The viewer stays blank, giving no feedback to the user that content is unavailable and appearing as a UI failure.

Fix:
-----
- Add detection logic for empty page lists returned by MangaDex.
- If no pages are found, render a user-friendly placeholder: “No scans available for this chapter.”
- Optionally fall back to alternative sources if configured.
- Update chapter metadata to flag unavailable chapters explicitly.

Status:
--------
Open – Needs either:
  - placeholder UI for chapters without scans
  - OR fallback source integration / explicit “unavailable” marking