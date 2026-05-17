import express from 'express';

const router = express.Router();

router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: { message: 'Query parameter q is required' } });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        return res.status(404).json({ error: { message: 'YouTube API Key is not configured on the server' } });
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(
                query
            )}&type=video&key=${apiKey}`
        );
        const data = await response.json();
        if (response.ok) {
            return res.json(data);
        } else {
            return res.status(response.status).json(data);
        }
    } catch (err) {
        console.error('YouTube search proxy error:', err);
        return res.status(500).json({ error: { message: 'Failed to search YouTube videos' } });
    }
});

export default router;
