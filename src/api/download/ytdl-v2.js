const { ytmp4 } = require('@vreden/youtube_scraper');

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

function collectDownloadLinks(value, format, output = [], seen = new Set()) {
    if (!value) return output;
    if (typeof value === 'string') {
        if (/^https?:\/\//i.test(value) && !seen.has(value)) {
            seen.add(value);
            output.push({ quality: format.toUpperCase(), format, url: value });
        }
        return output;
    }
    if (Array.isArray(value)) {
        value.forEach(item => collectDownloadLinks(item, format, output, seen));
        return output;
    }
    if (typeof value === 'object') {
        if (typeof value.url === 'string') collectDownloadLinks(value.url, format, output, seen);
        else if (typeof value.download === 'string' || Array.isArray(value.download)) collectDownloadLinks(value.download, format, output, seen);
        else if (value.link) collectDownloadLinks(value.link, format, output, seen);
    }
    return output;
}

async function convertYoutube(url) {
    const id = getYoutubeId(url);
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('Link YouTube tidak valid.');

    // The installed @vreden/youtube_scraper exports ytmp4; it does not export ytdlv2.
    const response = await ytmp4(url, 360);
    if (!response || response.status !== true || response.download?.status === false) {
        throw new Error(response?.download?.message || response?.message || 'Provider YouTube gagal memproses video.');
    }

    const links = collectDownloadLinks(response.download, 'mp4');
    if (!links.length) throw new Error('Provider YouTube tidak mengembalikan tautan video MP4.');

    return {
        status: true,
        result: {
            metadata: response.metadata || { title: response.download?.filename || 'YouTube video' },
            download: links
        }
    };
}

module.exports = function (app) {
    app.get('/download/ytdl-v2', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            const id = getYoutubeId(url);
            if (!id || !/^[\w-]{11}$/.test(id)) {
                return res.status(400).json({ status: false, message: 'Masukan link YouTube yang valid.' });
            }
            return res.status(200).json(await convertYoutube(url));
        } catch (error) {
            console.error('[YTDL-V2]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider YouTube sedang bermasalah.' });
        }
    });
};
