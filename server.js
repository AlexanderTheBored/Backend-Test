const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve everything statically
app.use(express.static(path.join(__dirname)));

// Make sure fallback route uses a function
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server is live on http://localhost:${PORT}`);
});
