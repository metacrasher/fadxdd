const axios = require('axios');

function validTikTokUrl(value) {
    try {
        const u = new URL(value);
        return /^([a-z0-9-]+\.)*tiktok\.com$/i.test(u.hostname);
    } catch { return false; }
}

// TikWM may return either an absolute CDN URL or a path relative to tikwm.com.
function normalizeMediaUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
        const parsed = new URL(value.trim(), 'https://www.tikwm.com');
        return parsed.protocol === 'https:' ? parsed.href : null;
    } catch { return null; }
}

function isAllowedMediaHost(hostname) {
    const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
    return /(^|\.)(tiktokcdn(?:-[a-z0-9-]+)?\.com|tiktokv\.com|byteoversea\.com|ibytedtos\.com|muscdn\.com|tikwm\.com|tiktok\.com|akamaized\.net|tokcdn\.com)$/.test(host);
}

module.exports = function (app) {
    // Stream media through this origin so the browser downloads bytes, not a JSON API response.
    app.get('/download/tiktok/file', async (req, res) => {
        const mediaUrl = normalizeMediaUrl(String(req.query.url || ''));
        if (!mediaUrl) return res.status(400).json({ status: false, message: 'Tautan file tidak valid.' });

        const parsed = new URL(mediaUrl);
        if (!isAllowedMediaHost(parsed.hostname)) {
            return res.status(400).json({ status: false, message: 'Host file tidak diizinkan.' });
        }

        try {
            const media = await axios.get(mediaUrl, {
                responseType: 'stream',
                timeout: 60000,
                maxRedirects: 5,
                beforeRedirect: (options) => {
                    const redirectHost = String(options.hostname || '').toLowerCase();
                    const redirectProtocol = options.protocol || 'https:';
                    if (redirectProtocol !== 'https:' || !isAllowedMediaHost(redirectHost)) {
                        throw new Error('CDN redirect host is not allowed.');
                    }
                },
                maxContentLength: 100 * 1024 * 1024,
                headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tiktok.com/' }
            });

            const requestedFormat = String(req.query.format || '').toLowerCase() === 'mp3' ? 'mp3' : 'mp4';
            const contentType = String(media.headers['content-type'] || '').split(';')[0].toLowerCase();
            if (!contentType.startsWith('video/') && !contentType.startsWith('audio/') && contentType !== 'application/octet-stream') {
                media.data.destroy();
                return res.status(502).json({ status: false, message: 'Provider tidak mengirim file media yang valid.' });
            }

            // The UI explicitly marks music downloads as MP3; CDN paths often end in .mp4
            // even when the URL points to TikTok's separate music stream.
            const isAudio = requestedFormat === 'mp3';
            const extension = isAudio ? 'mp3' : 'mp4';
            const requestedName = String(req.query.name || 'tiktok-media')
                .normalize('NFKC')
                .replace(/[\r\n"]/g, '')
                .replace(/[^\p{L}\p{N}._ -]/gu, '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 80) || 'tiktok-media';
            const asciiName = requestedName.replace(/[^a-z0-9._ -]/gi, '_').replace(/\s+/g, '_') || 'tiktok-media';
            res.status(200);
            res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : (contentType || 'video/mp4'));
            res.setHeader('Content-Disposition', 'attachment; filename="' + asciiName + '.' + extension + '"; filename*=UTF-8\'\'' + encodeURIComponent(requestedName + '.' + extension));
            res.setHeader('X-Content-Type-Options', 'nosniff');
            if (media.headers['content-length']) res.setHeader('Content-Length', media.headers['content-length']);
            media.data.on('error', () => { if (!res.headersSent) res.status(502); res.end(); });
            return media.data.pipe(res);
        } catch (error) {
            console.error('[TIKTOK-FILE]', error.message);
            if (!res.headersSent) return res.status(502).json({ status: false, message: 'Gagal mengambil file dari CDN TikTok. Silakan coba lagi.' });
            return res.end();
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
            const addVideo = (quality, value) => {
                const link = normalizeMediaUrl(value);
                if (link && isAllowedMediaHost(new URL(link).hostname) && !videos.some(item => item.url === link)) {
                    videos.push({ quality, format: 'mp4', url: link });
                }
            };
            addVideo('HD', data.hdplay);
            addVideo('Standard', data.play);

            // music_info.play is the preferred playable audio URL; data.music can be a legacy path.
            const audioValue = data.music_info?.play || data.music;
            const audioUrl = normalizeMediaUrl(audioValue);
            const audio = audioUrl && isAllowedMediaHost(new URL(audioUrl).hostname)
                ? { format: 'mp3', url: audioUrl }
                : null;

            if (!videos.length && !audio) throw new Error('Tautan video/audio tidak tersedia dari provider.');
            const fallbackTitle = data.author?.nickname
                ? 'Video TikTok - ' + data.author.nickname
                : 'TikTok-' + (data.id || 'media');
            const videoTitle = String(data.title || data.desc || '').trim() || fallbackTitle;
            return res.status(200).json({
                status: true,
                result: {
                    title: videoTitle,
                    thumbnail: data.cover || data.origin_cover || null,
                    duration: data.duration || null,
                    video: videos,
                    audio
                }
            });
        } catch (error) {
            console.error('[TIKTOK]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'TikTok provider sedang bermasalah.' });
        }
    });
};
