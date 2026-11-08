const axios = require('axios');

function validTikTokUrl(value) {
    try {
        const u = new URL(value);
        return /(^|\.)tiktok\.com$/i.test(u.hostname);
    } catch { return false; }
}

module.exports = function (app) {
    // Proxy only media URLs returned by trusted TikTok/TikWM CDN hosts so the
    // browser receives an attachment from this same origin (one-click download).
    app.get('/download/tiktok/file', async (req, res) => {
        const mediaUrl = String(req.query.url || '').trim();
        let parsed;
        try { parsed = new URL(mediaUrl); } catch {
            return res.status(400).json({ status: false, message: 'Tautan file tidak valid.' });
        }
        const allowedHost = /(^|\\.)(tiktokcdn\\.com|tiktokv\\.com|byteoversea\\.com|ibytedtos\\.com|tikwm\\.com|muscdn\\.com|tiktok\\.com)$/i;
        if (parsed.protocol !== 'https:' || !allowedHost.test(parsed.hostname)) {
            return res.status(400).json({ status: false, message: 'Host file tidak diizinkan.' });
        }
        try {
            const media = await axios.get(parsed.href, {
                responseType: 'stream',
                timeout: 60000,
                maxRedirects: 0,
                maxContentLength: 100 * 1024 * 1024,
                headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tiktok.com/' }
            });
            const contentType = String(media.headers['content-type'] || 'application/octet-stream').split(';')[0];
            const extension = contentType.includes('audio') ? 'mp3' : 'mp4';
            const requestedName = String(req.query.name || 'tiktok-media').replace(/[^a-z0-9_-]/gi, '_').slice(0, 80) || 'tiktok-media';
            res.status(200);
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', 'attachment; filename="' + requestedName + '.' + extension + '"');
            if (media.headers['content-length']) res.setHeader('Content-Length', media.headers['content-length']);
            media.data.on('error', () => { if (!res.headersSent) res.status(502); res.end(); });
            return media.data.pipe(res);
        } catch (error) {
            return res.status(502).json({ status: false, message: 'Gagal mengambil file dari CDN TikTok.' });
        }
    });

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
                if (typeof link === 'string' && /^https?:\/\//i.test(link) && !videos.some(item => item.url === link)) videos.push({ quality, format: 'mp4', url: link });
            };
            addVideo('HD', data.hdplay);
            addVideo('Standard', data.play);
            const audio = typeof data.music === 'string' && /^https?:\/\//i.test(data.music) ? data.music : null;
            if (!videos.length && !audio) throw new Error('Tautan video/audio tidak tersedia dari provider.');
            return res.status(200).json({ status: true, result: { title: data.title || 'TikTok media', thumbnail: data.cover || data.origin_cover || null, duration: data.duration || null, video: videos, audio: audio ? { format: 'mp3', url: audio } : null } });
        } catch (error) {
            return res.status(502).json({ status: false, message: error.message || 'TikTok provider sedang bermasalah.' });
        }
    });
};