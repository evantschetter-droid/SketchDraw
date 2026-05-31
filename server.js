const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const HF_TOKEN = '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';

app.use(express.static('public'));

app.post('/api/convert', upload.single('image'), async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(
      'https://api-inference.huggingface.co/models/lllyasviel/control_v11p_sd15_lineart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/octet-stream'
        },
        body: req.file.buffer,
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (response.status === 503) {
      return res.status(503).json({ error: 'Model is warming up — wait 20 seconds and try again.' });
    }

    if (!response.ok) {
      return res.status(500).json({ error: 'Conversion failed — please try again.' });
    }

    const buffer = await response.buffer();
    res.set('Content-Type', 'image/png');
    res.send(buffer);

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Timed out — the AI is busy. Wait 30 seconds and try again.' });
    }
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
