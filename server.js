const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// match the actual folder you're serving from
const baseDir = path.join(__dirname, 'Backend-Test');

app.use(express.static(baseDir));

// 💡 THIS MUST BE A FUNCTION
app.get('*', (req, res) => {
  res.sendFile(path.join(baseDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ MangaView is live at http://localhost:${PORT}`);
});
