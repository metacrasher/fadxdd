const { ytmp4 } = require('@vreden/youtube_scraper');

function getYoutubeId(value) {
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host) && !host.endsWith('.youtube.com')) return null;
        if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
        return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || null;
    } catch { return null; }
}

module.exports = function (app) {
    app.get('/download/ytdl-v2', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            const id = getYoutubeId(url);
            if (!id || !/^[\w-]{11}$/.test(id)) return res.status(400).json({ status: false, message: 'Masukan link YouTube yang valid.' });

            const allowed = [144, 360, 480, 720, 1080];
            const requested = Number.parseInt(req.query.quality || '360', 10);
            const quality = allowed.includes(requested) ? requested : 360;
            const response = await ytmp4(url, quality);
            if (!response || response.status !== true || response.download?.status === false || !response.download?.url) {
                throw new Error(response?.download?.message || response?.message || 'Provider YouTube gagal memproses video.');
            }

            const filename = String(response.download.filename || (response.metadata?.title || 'youtube-video') + '.mp4')
                .replace(/[\r\n"]/g, '').slice(0, 180);
            const downloadPath = '/download/youtube/file?url=' + encodeURIComponent(response.download.url) +
                '&name=' + encodeURIComponent(filename) + '&format=mp4';
            return res.status(200).json({
                status: true,
                result: {
                    metadata: response.metadata || { title: filename },
                    download: [{ quality: response.download.quality || (quality + 'p'), format: 'mp4', url: downloadPath, filename }]
                }
            });
        } catch (error) {
            console.error('[YTDL-V2]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider YouTube sedang bermasalah.' });
        }
    });
};
