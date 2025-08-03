const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 👇 This must exactly match your folder: 'Backend-Test'
const baseDir = path.join(__dirname, 'Backend-Test');

app.use(express.static(baseDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(baseDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ MangaView running from /Backend-Test on http://localhost:${PORT}`);
});
