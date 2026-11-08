const axios = require('axios');

function validInstagramUrl(value) {
    try {
        const url = new URL(value);
        return ['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(url.hostname) &&
            /^\/(p|reel|reels|tv)\//.test(url.pathname);
    } catch {
        return false;
    }
}

function safeMediaUrl(value) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

async function igdl(url) {
    if (!validInstagramUrl(url)) {
        throw new Error('Masukkan link postingan atau Reels Instagram publik yang valid.');
    }

    let response;
    try {
        response = await axios.get('https://ahm7xmakki.com/api/alldl', {
            params: { url },
            timeout: 35000,
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; FadXD/1.0)'
            },
            validateStatus: status => status >= 200 && status < 500
        });
    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new Error('Provider Instagram melewati batas waktu. Silakan coba lagi.');
        }
        throw new Error('Provider Instagram tidak dapat dihubungi sementara.');
    }

    if (response.status === 429) {
        throw new Error('Provider Instagram sedang membatasi permintaan. Coba lagi beberapa saat.');
    }
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Provider Instagram merespons HTTP ${response.status}.`);
    }

    const media = response.data?.mediaInfo;
    if (response.data?.success !== true || !media || typeof media !== 'object') {
        throw new Error(response.data?.message || 'Media tidak ditemukan atau postingan Instagram tidak dapat diakses.');
    }

    const qualities = Array.isArray(media.qualities)
        ? media.qualities.map((item, index) => ({
            quality: String(item?.quality || `Pilihan ${index + 1}`),
            url: safeMediaUrl(item?.url)
        })).filter(item => item.url)
        : [];

    const fallbackVideo = safeMediaUrl(media.videoUrl);
    if (!qualities.length && fallbackVideo) {
        qualities.push({ quality: 'Terbaik', url: fallbackVideo });
    }

    const audioUrl = safeMediaUrl(media.audioUrl);
    if (!qualities.length && !audioUrl) {
        throw new Error('Provider tidak menyediakan tautan video atau audio untuk postingan ini.');
    }

    return {
        title: String(media.title || 'Instagram media').slice(0, 180),
        thumbnail: safeMediaUrl(media.thumbnail),
        video: qualities,
        audio: audioUrl ? { quality: 'MP3', url: audioUrl } : null
    };
}

module.exports = function (app) {
    app.get('/download/instagram', async (req, res) => {
        try {
            const result = await igdl(String(req.query.url || '').trim());
            return res.status(200).json({ status: true, result });
        } catch (error) {
            return res.status(502).json({
                status: false,
                message: error.message || 'Provider Instagram sedang bermasalah.'
            });
        }
    });
};
