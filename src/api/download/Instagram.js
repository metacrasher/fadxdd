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

function collectMediaCandidates(value, output = [], depth = 0) {
    if (!value || typeof value !== 'object' || depth > 6) return output;

    if (Array.isArray(value)) {
        value.forEach(item => collectMediaCandidates(item, output, depth + 1));
        return output;
    }

    const videoKeys = ['url', 'videoUrl', 'video_url', 'downloadUrl', 'download_url', 'hd', 'sd', 'high', 'low', 'play'];
    const audioKeys = ['audioUrl', 'audio_url', 'musicUrl', 'music_url', 'mp3', 'audio'];
    const quality = value.quality || value.label || value.name || value.resolution || value.type;

    for (const key of videoKeys) {
        const candidate = safeMediaUrl(value[key]);
        if (candidate && !/\.(mp3|m4a|aac|ogg)(?:$|\?)/i.test(candidate)) {
            output.push({ quality: String(quality || 'Terbaik'), url: candidate, kind: 'video' });
        }
    }

    for (const key of audioKeys) {
        const raw = value[key];
        const candidate = safeMediaUrl(typeof raw === 'string' ? raw : raw?.url || raw?.downloadUrl);
        if (candidate) output.push({ quality: 'MP3', url: candidate, kind: 'audio' });
    }

    Object.entries(value).forEach(([key, nested]) => {
        if (nested && typeof nested === 'object') {
            collectMediaCandidates(nested, output, depth + 1);
        } else if (typeof nested === 'string' && /^(video|download|media|format|quality|result)/i.test(key)) {
            const candidate = safeMediaUrl(nested);
            if (candidate) output.push({ quality: String(quality || key), url: candidate, kind: 'video' });
        }
    });

    return output;
}

async function igdl(url) {
    if (!validInstagramUrl(url)) {
        throw new Error('Masukkan link postingan atau Reels Instagram publik yang valid.');
    }

    let response;
    try {
        response = await axios.get('https://ahm7xmakki.com/api/alldl', {
            params: { url },
            timeout: 45000,
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'
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

    const payload = response.data;
    if (!payload || typeof payload !== 'object') {
        throw new Error('Provider Instagram mengirim respons yang tidak dikenali. Coba lagi nanti.');
    }

    const media = payload.mediaInfo || payload.media || payload.result || payload.data || payload;
    const candidates = collectMediaCandidates(media);
    const unique = [...new Map(candidates.map(item => [item.url, item])).values()];
    const audio = unique.find(item => item.kind === 'audio') || null;
    const video = unique.filter(item => item.kind === 'video');

    // Support the documented AHM7 response and common alternate field names.
    const directVideo = safeMediaUrl(
        media.videoUrl || media.video_url || media.downloadUrl || media.download_url ||
        media.url || payload.videoUrl || payload.video_url
    );
    if (!video.length && directVideo) video.push({ quality: 'Terbaik', url: directVideo });

    const directAudio = safeMediaUrl(
        media.audioUrl || media.audio_url || media.musicUrl || media.music_url ||
        media.audio?.url || payload.audioUrl || payload.audio_url
    );
    const audioResult = audio || (directAudio ? { quality: 'MP3', url: directAudio } : null);

    const success = payload.success === true || payload.status === true ||
        payload.ok === true || Boolean(video.length || audioResult);
    if (!success) {
        const providerMessage = payload.message || payload.error?.message || payload.error;
        throw new Error(typeof providerMessage === 'string' && providerMessage.length < 220
            ? `Provider Instagram: ${providerMessage}`
            : 'Provider gagal mengambil media Instagram. Kemungkinan format respons atau akses provider sedang berubah.');
    }

    if (!video.length && !audioResult) {
        throw new Error('Provider merespons berhasil, tetapi tautan video/audio tidak ditemukan pada responsnya.');
    }

    const title = media.title || media.caption || payload.title || 'Instagram media';
    const thumbnail = safeMediaUrl(media.thumbnail || media.thumbnailUrl || media.thumbnail_url || payload.thumbnail);

    return {
        title: String(title).slice(0, 180),
        thumbnail,
        video: video.map((item, index) => ({
            quality: String(item.quality || (index === 0 ? 'Terbaik' : `Pilihan ${index + 1}`)),
            url: item.url
        })),
        audio: audioResult ? { quality: 'MP3', url: audioResult.url } : null
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
