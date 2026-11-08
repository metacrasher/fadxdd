const youtubeScraper = require('@vreden/youtube_scraper');

function getYoutubeId(value) {
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase().replace(/^www\\./, '');
        if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host) && !host.endsWith('.youtube.com')) return null;
        if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
        return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || null;
    } catch { return null; }
}

function findDownloadUrls(value, output = [], seen = new Set(), label = '') {
    if (!value) return output;
    if (typeof value === 'string') {
        if (/^https?:\\/\\//i.test(value) && /(download|url|link|mp4|mp3|video|audio|quality|format)/i.test(label) && !/(thumbnail|image|avatar|cover)/i.test(label) && !seen.has(value)) {
            seen.add(value);
            output.push({ quality: label || 'Download', format: /mp3|audio/i.test(label) ? 'mp3' : 'mp4', url: value });
        }
        return output;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => findDownloadUrls(item, output, seen, item?.quality || item?.format || 'Pilihan ' + (index + 1)));
        return output;
    }
    if (typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            const childLabel = child && typeof child === 'object' ? (child.quality || child.format || child.label || key) : key;
            findDownloadUrls(child, output, seen, String(childLabel));
        }
    }
    return output;
}

function getMethod(format) {
    const names = format === 'mp3' ? ['ytmp3', 'youtubeMp3', 'downloadAudio'] : ['ytmp4', 'youtubeMp4', 'downloadVideo'];
    for (const name of names) {
        if (typeof youtubeScraper[name] === 'function') return youtubeScraper[name];
        if (typeof youtubeScraper.default?.[name] === 'function') return youtubeScraper.default[name];
    }
    throw new Error('Modul downloader YouTube tidak menyediakan fungsi ' + format.toUpperCase() + '.');
}

async function convertYoutube(url, format) {
    const id = getYoutubeId(url);
    if (!id || !/^[\\w-]{11}$/.test(id)) throw new Error('Link YouTube tidak valid.');
    const result = await getMethod(format)(url);
    if (!result || result.status === false || result.success === false) {
        throw new Error(result?.message || result?.error || 'Provider YouTube tidak dapat memproses video ini.');
    }
    const root = result.result || result.data || result;
    const links = findDownloadUrls(root);
    const wanted = links.filter(item => item.format === format || (format === 'mp4' && !/mp3|audio/i.test(item.quality)));
    if (!wanted.length) throw new Error('Provider YouTube tidak mengembalikan tautan file ' + format.toUpperCase() + '.');
    const title = root.title || root.metadata?.title || root.videoDetails?.title || 'YouTube media';
    return {
        status: true,
        result: {
            metadata: { title },
            download: wanted.map(item => ({ quality: item.quality, format, url: item.url }))
        }
    };
}

module.exports = function (app) {
    app.get('/download/ytdl-v2', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            if (!getYoutubeId(url) || !/^[\\w-]{11}$/.test(getYoutubeId(url) || '')) {
                return res.status(400).json({ status: false, message: 'Masukan link YouTube yang valid.' });
            }
            const format = String(req.query.format || 'mp4').toLowerCase() === 'mp3' ? 'mp3' : 'mp4';
            const result = await convertYoutube(url, format);
            return res.status(200).json(result);
        } catch (error) {
            console.error('[YTDL-V2]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider YouTube sedang bermasalah.' });
        }
    });
};
