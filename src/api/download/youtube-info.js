const { metadata } = require('@vreden/youtube_scraper');

function isValidYoutubeUrl(value) {
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        const allowed = ['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'];
        if (!allowed.includes(host) && !host.endsWith('.youtube.com')) return false;
        const id = host === 'youtu.be'
            ? parsed.pathname.split('/').filter(Boolean)[0]
            : (parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop());
        return /^[\w-]{11}$/.test(id || '');
    } catch {
        return false;
    }
}

module.exports = function (app) {
    app.get('/download/youtube/info', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            if (!isValidYoutubeUrl(url)) {
                return res.status(400).json({ status: false, message: 'Masukkan link YouTube yang valid.' });
            }

            const result = await metadata(url);
            if (!result || result.status !== true) {
                return res.status(502).json({
                    status: false,
                    message: result?.message || 'Informasi video YouTube tidak dapat dimuat.'
                });
            }

            return res.status(200).json({
                status: true,
                result: {
                    title: result.title || 'Video YouTube',
                    thumbnail: result.thumbnails?.find(item => item.quality === 'high')?.url ||
                        result.thumbnails?.[0]?.url || '',
                    recommendedQuality: 360,
                    supportedQualities: [144, 360, 480, 720, 1080]
                }
            });
        } catch (error) {
            console.error('[YOUTUBE-INFO]', error.message);
            return res.status(502).json({
                status: false,
                message: 'Gagal mengambil informasi video YouTube.'
            });
        }
    });
};
