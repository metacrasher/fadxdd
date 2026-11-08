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

function collectMediaCandidates(value, output = [], depth = 0, mediaKind = 'video') {
    if (!value || typeof value !== 'object' || depth > 6) return output;

    if (Array.isArray(value)) {
        value.forEach(item => collectMediaCandidates(item, output, depth + 1, mediaKind));
        return output;
    }

    const quality = value.quality || value.label || value.name || value.resolution || value.type;
    const keys = mediaKind === 'audio'
        ? ['url', 'audioUrl', 'audio_url', 'musicUrl', 'music_url', 'mp3', 'downloadUrl', 'download_url']
        : ['url', 'videoUrl', 'video_url', 'downloadUrl', 'download_url', 'hd', 'sd', 'high', 'low', 'play'];

    for (const key of keys) {
        const raw = value[key];
        const candidate = safeMediaUrl(typeof raw === 'string' ? raw : raw?.url || raw?.downloadUrl);
        if (candidate) {
            const kind = mediaKind === 'audio' || /\\.(mp3|m4a|aac|ogg)(?:$|\\?)/i.test(candidate) ? 'audio' : 'video';
            output.push({ quality: String(quality || (kind === 'audio' ? 'MP3' : 'Terbaik')), url: candidate, kind });
        }
    }

    Object.entries(value).forEach(([key, nested]) => {
        if (nested && typeof nested === 'object') {
            const childKind = /audio|music|mp3/i.test(key) ? 'audio' : /video|quality|format|download|media/i.test(key) ? 'video' : mediaKind;
            collectMediaCandidates(nested, output, depth + 1, childKind);
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
        response = await axios.get('https://freeapi.pro/api/alldl', {
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
        if (error.response) {
            throw new Error(`Provider Instagram mengalami HTTP ${error.response.status} saat menghubungi server.`);
        }
        const networkErrors = {
            ENOTFOUND: 'DNS provider tidak ditemukan dari server API.',
            EAI_AGAIN: 'DNS provider sedang gagal sementara dari server API.',
            ECONNREFUSED: 'Koneksi ke server provider ditolak.',
            ECONNRESET: 'Koneksi ke server provider terputus.',
            EHOSTUNREACH: 'Server API tidak dapat menjangkau host provider.',
            CERT_HAS_EXPIRED: 'Sertifikat HTTPS provider sudah kedaluwarsa.',
            ERR_TLS_CERT_ALTNAME_INVALID: 'Nama host tidak cocok dengan sertifikat HTTPS provider.'
        };
        const reason = networkErrors[error.code] || error.code || 'NETWORK_ERROR';
        throw new Error(`Provider Instagram tidak dapat dihubungi: ${reason}`);
    }

    if (response.status === 429) {
        throw new Error('Provider Instagram sedang membatasi permintaan. Coba lagi beberapa saat.');
    }
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Provider Instagram merespons HTTP ${response.status}.`);
    }

    // Provider dapat mengirim JSON sebagai object maupun string.
    let payload = response.data;
    if (typeof payload === 'string') {
        const trimmed = payload.trim();
        try {
            payload = JSON.parse(trimmed);
        } catch {
            throw new Error(trimmed && trimmed.length < 220
                ? `Provider Instagram: ${trimmed}`
                : 'Provider Instagram mengirim format respons yang bukan JSON valid.');
        }
    }
    if (!payload || typeof payload !== 'object') {
        throw new Error('Provider Instagram mengirim respons kosong atau format yang tidak dikenali.');
    }

    // Unwrap common provider envelopes without assuming one fixed response shape.
    let media = payload;
    for (let depth = 0; depth < 5; depth++) {
        if (Array.isArray(media)) break;
        const nested = media.mediaInfo ?? media.media_info ?? media.media ??
            media.result ?? media.data ?? media.response;
        if (!nested || nested === media || typeof nested !== 'object') break;
        media = nested;
    }
    const candidates = collectMediaCandidates(media);
    const unique = [...new Map(candidates.map(item => [item.url, item])).values()];
    const audio = unique.find(item => item.kind === 'audio') || null;
    const video = unique.filter(item => item.kind === 'video');

    // Support the documented AHM7 response and common alternate field names.
    const directVideo = safeMediaUrl(
        media.videoUrl || media.video_url || media.video || media.downloadUrl || media.download_url ||
        media.download || media.url || payload.videoUrl || payload.video_url || payload.url
    ) || safeMediaUrl(typeof media.video === 'object' ? (media.video.url || media.video.downloadUrl) : null);
    if (!video.length && directVideo) video.push({ quality: 'Terbaik', url: directVideo });

    const directAudio = safeMediaUrl(
        media.audioUrl || media.audio_url || media.musicUrl || media.music_url ||
        media.audio?.url || media.music?.url || payload.audioUrl || payload.audio_url
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
