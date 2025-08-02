const express = require('express');
const app = express();
const port = 3001;

app.get('/health', (req, res) => {
  res.send('OK');
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
}); 