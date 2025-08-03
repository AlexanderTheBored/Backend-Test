const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const baseDir = path.join(__dirname, 'Backend-Test');

// Serve static files
app.use(express.static(baseDir));

// ⛔ DO NOT PASS A STRING HERE
app.get('*', (req, res) => {
  res.sendFile(path.join(baseDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ MangaView running at http://localhost:${PORT}`);
});
