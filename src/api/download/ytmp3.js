const youtubeScraper = require('@vreden/youtube_scraper');

function getYoutubeId(value) {
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host) && !host.endsWith('.youtube.com')) return null;
        if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
        return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || null;
    } catch { return null; }
}

function extractUrls(value, output = [], seen = new Set(), label = '') {
    if (!value) return output;
    if (typeof value === 'string') {
        if (/^https?:\/\//i.test(value) && /(download|url|link|mp3|audio|quality|format)/i.test(label) && !/(thumbnail|image|avatar|cover)/i.test(label) && !seen.has(value)) {
            seen.add(value);
            output.push(value);
        }
    } else if (Array.isArray(value)) {
        value.forEach((item, index) => extractUrls(item, output, seen, item?.quality || item?.format || 'Option ' + index));
    } else if (typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) extractUrls(child, output, seen, child && typeof child === 'object' ? (child.quality || child.format || child.label || key) : key);
    }
    return output;
}

function getAudioMethod() {
    const names = ['ytmp3', 'youtubeMp3', 'downloadAudio'];
    for (const name of names) {
        if (typeof youtubeScraper[name] === 'function') return youtubeScraper[name];
        if (typeof youtubeScraper.default?.[name] === 'function') return youtubeScraper.default[name];
    }
    throw new Error('Modul downloader YouTube tidak menyediakan fungsi MP3.');
}

async function convertYoutube(url) {
    const id = getYoutubeId(url);
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('Link YouTube tidak valid.');
    const result = await getAudioMethod()(url);
    if (!result || result.status === false || result.success === false) throw new Error(result?.message || result?.error || 'Provider YouTube gagal memproses audio.');
    const root = result.result || result.data || result;
    const links = extractUrls(root);
    if (!links.length) throw new Error('Provider YouTube tidak mengembalikan tautan MP3.');
    return { title: root.title || root.metadata?.title || 'YouTube music', format: 'mp3', url: links[0] };
}

module.exports = function (app) {
    app.get('/download/ytmp3', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            if (!getYoutubeId(url) || !/^[\w-]{11}$/.test(getYoutubeId(url) || '')) return res.status(400).json({ status: false, message: 'Masukan link YouTube yang valid.' });
            const result = await convertYoutube(url);
            return res.status(200).json({ status: true, result });
        } catch (error) {
            console.error('[YTMP3]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider MP3 sedang bermasalah.' });
        }
    });

    app.get('/download/ytmp4', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            if (!getYoutubeId(url)) return res.status(400).json({ status: false, message: 'Masukan link YouTube yang valid.' });
            const result = await convertYoutube(url, 'mp4');
            return res.status(200).json({ status: true, result });
        } catch (error) {
            console.error('[YTMP4]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider MP4 sedang bermasalah.' });
        }
    });
};
