const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());

app.post('/api/download', async (req, res) => {
    const { url } = req.body;

    if (!url || !url.includes('instagram.com')) {
        return res.status(400).json({ error: 'Invalid Instagram URL' });
    }

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36'
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
            res.status(200).json({
                message: 'Download complete',
                file: fileName
            });
        });

        writeStream.on('error', () => {
            res.status(500).json({ error: 'Error saving the video.' });
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch or download the video' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
