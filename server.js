const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve from the repo root (/app)
const baseDir = __dirname;

app.use(express.static(baseDir));

// Fallback for client-side routes (if you need it)
app.get('*', (req, res) => {
  res.sendFile(path.join(baseDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ MangaView live at http://localhost:${PORT}`);
});
