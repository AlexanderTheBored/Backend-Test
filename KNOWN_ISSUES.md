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
