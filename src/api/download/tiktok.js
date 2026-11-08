const axios = require('axios');

function validTikTokUrl(value) {
    try {
        const u = new URL(value);
        return /(^|\\.)tiktok\\.com$/i.test(u.hostname);
    } catch { return false; }
}

module.exports = function (app) {
    app.get('/download/tiktok', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            if (!validTikTokUrl(url)) return res.status(400).json({ status: false, message: 'Masukan link TikTok yang valid.' });
            const body = new URLSearchParams({ url, hd: '1' });
            const response = await axios.post('https://tikwm.com/api/', body.toString(), {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    Cookie: 'current_language=en',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
                }
            });
            const data = response.data?.data;
            if (response.data?.code !== 0 || !data) throw new Error(response.data?.msg || 'Provider TikTok tidak menemukan video.');
            const videos = [];
            const addVideo = (quality, link) => {
                if (typeof link === 'string' && /^https?:\\/\\//i.test(link) && !videos.some(item => item.url === link)) videos.push({ quality, format: 'mp4', url: link });
            };
            addVideo('HD', data.hdplay);
            addVideo('Standard', data.play);
            const audio = typeof data.music === 'string' && /^https?:\\/\\//i.test(data.music) ? data.music : null;
            if (!videos.length && !audio) throw new Error('Tautan video/audio tidak tersedia dari provider.');
            return res.status(200).json({ status: true, result: { title: data.title || 'TikTok media', thumbnail: data.cover || data.origin_cover || null, duration: data.duration || null, video: videos, audio: audio ? { format: 'mp3', url: audio } : null } });
        } catch (error) {
            return res.status(502).json({ status: false, message: error.message || 'TikTok provider sedang bermasalah.' });
        }
    });
};