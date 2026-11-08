const { ytmp3, ytmp4 } = require('@vreden/youtube_scraper');

function getYoutubeId(value) {
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host) && !host.endsWith('.youtube.com')) return null;
        if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
        return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || null;
    } catch {
        return null;
    }
}

function getDownloadUrl(value) {
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = getDownloadUrl(item);
            if (found) return found;
        }
    }
    if (value && typeof value === 'object') {
        return getDownloadUrl(value.url || value.download || value.link);
    }
    return null;
}

async function convertYoutube(url, format) {
    const id = getYoutubeId(url);
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('Link YouTube tidak valid.');

    const isAudio = format === 'mp3';
    const result = await (isAudio ? ytmp3(url, '128') : ytmp4(url, '360'));
    if (!result || result.status !== true) {
        throw new Error(result?.result || result?.message || 'Provider YouTube gagal memproses media.');
    }
    const downloadUrl = getDownloadUrl(result.download);
    if (!downloadUrl) throw new Error('Provider YouTube tidak mengembalikan tautan unduhan.');

    return {
        title: result.metadata?.title || 'YouTube media',
        format,
        url: downloadUrl
    };
}

module.exports = function (app) {
    app.get('/download/ytmp3', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            if (!getYoutubeId(url) || !/^[\w-]{11}$/.test(getYoutubeId(url) || '')) {
                return res.status(400).json({ status: false, message: 'Masukan link YouTube yang valid.' });
            }
            return res.status(200).json({ status: true, result: await convertYoutube(url, 'mp3') });
        } catch (error) {
            console.error('[YTMP3]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider MP3 sedang bermasalah.' });
        }
    });

    app.get('/download/ytmp4', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            if (!getYoutubeId(url) || !/^[\w-]{11}$/.test(getYoutubeId(url) || '')) {
                return res.status(400).json({ status: false, message: 'Masukan link YouTube yang valid.' });
            }
            return res.status(200).json({ status: true, result: await convertYoutube(url, 'mp4') });
        } catch (error) {
            console.error('[YTMP4]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider MP4 sedang bermasalah.' });
        }
    });
};
