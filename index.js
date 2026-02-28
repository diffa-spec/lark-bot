const express = require('express');
const app = express();

app.use(express.json());

app.post('/lark-webhook', (req, res) => {
  const body = req.body;

  // Lark URL verification
  if (body.type === 'url_verification') {
    return res.json({
      challenge: body.challenge
    });
  }

  console.log('Event received:', body);

  res.send('ok');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});