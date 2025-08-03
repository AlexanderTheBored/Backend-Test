const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const rootPath = path.join(__dirname, 'Backend test');

// Serve all static files from the 'Backend test' directory
app.use(express.static(rootPath));

// Fallback: send index.html on any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(rootPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ MangaView server running on http://localhost:${PORT}`);
});
