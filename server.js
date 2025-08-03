const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const baseDir = path.join(__dirname, 'Backend-Test');

// Serve static files and default to index.html
app.use(express.static(baseDir, {
  index: 'index.html'
}));

app.listen(PORT, () => {
  console.log(`✅ MangaView running at http://localhost:${PORT}`);
})
