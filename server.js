const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const HF_TOKEN = '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';

app.use(express.static('public'));

app.post('/api/convert', upload.single('image'), async (req, res) => {
  console.log('Convert request received');
  try {
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ error: 'No image received' });
    }
    console.log('File size:', req.file.size);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    console.log('Calling Hugging Face...');
    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/lllyasviel/control_v11p_sd15_lineart',
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
    console.log('HF response status:', response.status);

    if (response.status === 503) {
      return res.status(503).json({ error: 'Model is warming up — wait 20 seconds and try again.' });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.log('HF error:', errText);
      return res.status(500).json({ error: 'Conversion failed — please try again.' });
    }

    const buffer = await response.buffer();
    console.log('Success! Buffer size:', buffer.length);
    res.set('Content-Type', 'image/png');
    res.send(buffer);

  } catch (err) {
    console.log('Caught error:', err.message);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Timed out — wait 30 seconds and try again.' });
    }
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
