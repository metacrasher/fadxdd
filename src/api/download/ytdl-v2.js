const { ytdlv2 } = require('@vreden/youtube_scraper');

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
        else if (typeof value.download === 'string') collectDownloadLinks(value.download, format, output, seen);
        else if (Array.isArray(value.download)) collectDownloadLinks(value.download, format, output, seen);
        else if (value.link) collectDownloadLinks(value.link, format, output, seen);
    }
    return output;
}

async function convertYoutube(url, format) {
    const id = getYoutubeId(url);
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('Link YouTube tidak valid.');

    const quality = format === 'mp3' ? 128 : 360;
    const result = await ytdlv2(url, quality);
    if (!result || result.status !== true) {
        throw new Error(result?.result || result?.message || 'Provider YouTube gagal memproses video.');
    }

    const links = collectDownloadLinks(result.download, format);
    if (!links.length) throw new Error('Provider YouTube tidak mengembalikan tautan file ' + format.toUpperCase() + '.');

    return {
        status: true,
        result: {
            metadata: result.metadata || { title: 'YouTube media' },
            download: links
        }
    };
}

module.exports = function (app) {
    app.get('/download/ytdl-v2', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            if (!getYoutubeId(url) || !/^[\w-]{11}$/.test(getYoutubeId(url) || '')) {
                return res.status(400).json({ status: false, message: 'Masukan link YouTube yang valid.' });
            }
            const format = String(req.query.format || 'mp4').toLowerCase() === 'mp3' ? 'mp3' : 'mp4';
            return res.status(200).json(await convertYoutube(url, format));
        } catch (error) {
            console.error('[YTDL-V2]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider YouTube sedang bermasalah.' });
        }
    });
};
