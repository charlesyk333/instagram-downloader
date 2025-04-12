const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Instagram Video Downloader API. Use POST /api/download');
});

// Download route
app.post('/api/download', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'Invalid Instagram URL' });
  }

  if (!url.match(/instagram\.com\/(reel|p)\//)) {
    return res.status(400).json({ error: 'Only Reels/Posts are supported' });
  }

  try {
    const response = await axios.get(url, {
      maxRedirects: 0,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    const $ = cheerio.load(response.data);
    const videoUrl = $('meta[property="og:video"]').attr('content');

    if (!videoUrl) {
      return res.status(404).json({ error: 'Video URL not found. It might be private.' });
    }

    const fileName = `reel_${Date.now()}.mp4`;
    const filePath = path.join(__dirname, fileName);

    const videoStream = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'stream'
    });

    const writeStream = fs.createWriteStream(filePath);
    videoStream.data.pipe(writeStream);

    writeStream.on('finish', () => {
      res.status(200).json({ message: 'Download complete', file: fileName });
      setTimeout(() => fs.unlinkSync(filePath), 3600000); // Delete after 1h
    });

    writeStream.on('error', () => {
      res.status(500).json({ error: 'Error saving the video.' });
    });

  } catch (error) {
    console.error('Full error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch/download video',
      details: error.message 
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});