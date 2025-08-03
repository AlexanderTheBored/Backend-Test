// server.js
const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Serve everything out of the project root
const staticDir = path.join(__dirname);

app.use(express.static(staticDir));

// Fallback: any unknown route should return index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ MangaView running at http://localhost:${PORT}`);
});
