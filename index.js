const puppeteer = require('puppeteer');

app.post('/api/download', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'Invalid Instagram URL' });
  }

  if (!url.match(/instagram\.com\/(reel|p)\//)) {
    return res.status(400).json({ error: 'Only Reels/Posts are supported' });
  }

  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    await page.goto(url, { waitUntil: 'networkidle2' });

    const videoUrl = await page.$eval('meta[property="og:video"]', el => el.content);

    await browser.close();

    if (!videoUrl) {
      return res.status(404).json({ error: 'Video URL not found. It might be private.' });
    }

    // Continue with axios to download the video
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
      setTimeout(() => fs.unlinkSync(filePath), 3600000); // 1 hour delete
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
