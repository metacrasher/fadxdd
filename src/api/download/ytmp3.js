const { ytmp3 } = require('@vreden/youtube_scraper');

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
    app.get('/download/ytmp3', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            const id = getYoutubeId(url);
            if (!id || !/^[\w-]{11}$/.test(id)) return res.status(400).json({ status: false, message: 'Masukan link YouTube yang valid.' });
            const result = await ytmp3(url, 128);
            if (!result || result.status !== true || result.download?.status === false || !result.download?.url) {
                throw new Error(result?.download?.message || result?.message || 'Provider MP3 gagal memproses audio.');
            }
            const filename = String(result.download.filename || (result.metadata?.title || 'youtube-audio') + '.mp3').replace(/[\r\n"]/g, '').slice(0, 180);
            const downloadUrl = '/download/youtube/file?url=' + encodeURIComponent(result.download.url) +
                '&name=' + encodeURIComponent(filename) + '&format=mp3';
            return res.status(200).json({ status: true, result: { title: result.metadata?.title || filename, format: 'mp3', url: downloadUrl, filename } });
        } catch (error) {
            console.error('[YTMP3]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider MP3 sedang bermasalah.' });
        }
    });
};
