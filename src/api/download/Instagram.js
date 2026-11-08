const axios = require('axios');
const cheerio = require('cheerio');

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

async function getRetatubeInstagramAudio(url) {
    // Secondary source: Retatube exposes a separate audio download link in its
    // result HTML. Keep this fallback isolated to Instagram MP3 handling.
    try {
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
            'HX-Request': 'true',
            'Origin': 'https://retatube.com',
            'Referer': 'https://retatube.com/'
        };
        const page = await axios.get('https://retatube.com/api/v1/aio/index?s=retatube.com', {
            headers,
            timeout: 10000
        });
        const $page = cheerio.load(page.data);
        const prefix = $page('input[name="prefix"]').val();
        if (!prefix) return null;

        const result = await axios.post(
            'https://retatube.com/api/v1/aio/search',
            `prefix=${encodeURIComponent(prefix)}&vid=${encodeURIComponent(url)}`,
            { headers, timeout: 12000 }
        );
        const $result = cheerio.load(result.data);
        const audioLink = $result('#col-1098044499 a.custom_green_color').attr('href') ||
            $result('#col-1098044499 a[href*="mp3"]').attr('href');
        return safeMediaUrl(audioLink);
    } catch {
        // A fallback outage must not turn a working Instagram video download
        // into an API failure.
        return null;
    }
}

async function igdl(url) {
    if (!validInstagramUrl(url)) {
        throw new Error('Masukkan link postingan atau Reels Instagram publik yang valid.');
    }

    let response;
    try {
        // Retry one time for transient connection failures (common with free providers).
        for (let attempt = 0; attempt < 2; attempt++) {
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
                break;
            } catch (requestError) {
                const retryable = ['ECONNABORTED', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNRESET', 'EHOSTUNREACH'].includes(requestError.code);
                if (attempt === 0 && retryable && !requestError.response) continue;
                throw requestError;
            }
        }
    } catch (error) {
        // If the primary provider cannot be reached, try the dedicated Instagram
        // audio resolver before returning a provider-connection error. This keeps
        // the MP3 path independent from the primary video resolver.
        const fallbackAudio = await getRetatubeInstagramAudio(url);
        if (fallbackAudio) {
            return {
                title: 'Instagram media',
                thumbnail: null,
                video: [],
                audio: { quality: 'MP3', url: fallbackAudio }
            };
        }

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new Error('Provider Instagram dan server cadangan melewati batas waktu. Silakan coba lagi.');
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
    const video = candidates.filter(item => item.kind === 'video');
    const audio = candidates.find(item => item.kind === 'audio') || null;

    // Preserve the provider's actual quality variants instead of collapsing them
    // into a single generic "Terbaik" option.
    const explicitQualities = Array.isArray(media.qualities) ? media.qualities
        : Array.isArray(media.qualityOptions) ? media.qualityOptions
        : Array.isArray(media.quality_options) ? media.quality_options
        : [];
    for (const option of explicitQualities) {
        if (!option || typeof option !== 'object') continue;
        const mediaUrl = safeMediaUrl(option.url || option.videoUrl || option.video_url || option.downloadUrl);
        if (!mediaUrl) continue;
        const height = option.height || option.resolution;
        const inferred = String(option.quality || option.label || height || '').trim() ||
            (mediaUrl.match(/(?:^|[._-])(\d{3,4})p(?:[._-]|$)/i)?.[1] ? `${mediaUrl.match(/(?:^|[._-])(\d{3,4})p(?:[._-]|$)/i)[1]}p` : '');
        video.push({ quality: inferred || 'Kualitas tersedia', url: mediaUrl });
    }

    // If explicit resolution variants exist, discard generic entries collected
    // from the provider's single videoUrl field.
    const normalizedVideo = explicitQualities.length
        ? video.filter(item => item.quality !== 'Terbaik')
        : video;
    const uniqueVideo = [...new Map(normalizedVideo.map(item => [item.url, item])).values()];
    video.length = 0;
    video.push(...uniqueVideo);

    // Support the documented AHM7 response and common alternate field names.
    const directVideo = safeMediaUrl(
        media.videoUrl || media.video_url || media.video || media.downloadUrl || media.download_url ||
        media.download || media.url || payload.videoUrl || payload.video_url || payload.url
    ) || safeMediaUrl(typeof media.video === 'object' ? (media.video.url || media.video.downloadUrl) : null);
    if (!video.length && directVideo) video.push({ quality: 'Terbaik', url: directVideo });
    else if (!explicitQualities.length && directVideo && !video.some(item => item.url === directVideo)) {
        video.unshift({ quality: 'Terbaik', url: directVideo });
    }

    // Sort numeric resolutions from highest to lowest; keep unknown labels afterward.
    const resolutionOf = item => {
        const label = String(item.quality || '');
        return Number(label.match(/(\d{3,4})\s*p/i)?.[1] || label.match(/\b(\d{3,4})\b/)?.[1] || 0);
    };
    video.sort((a, b) => resolutionOf(b) - resolutionOf(a));

    const directAudio = safeMediaUrl(
        media.audioUrl || media.audio_url || media.musicUrl || media.music_url ||
        media.audio?.url || media.audio?.downloadUrl || media.music?.url || media.music?.downloadUrl ||
        media.mp3Url || media.mp3_url || media.audioDownloadUrl || media.audio_download_url ||
        (typeof media.audio === 'string' ? media.audio : null) ||
        (typeof media.music === 'string' ? media.music : null) ||
        payload.audioUrl || payload.audio_url || payload.mp3Url || payload.mp3_url
    );
    let audioResult = audio || (directAudio ? { quality: 'MP3', url: directAudio } : null);

    // The primary provider often returns video only for Instagram. Try a
    // separate audio endpoint before reporting that MP3 is unavailable.
    if (!audioResult) {
        const fallbackAudio = await getRetatubeInstagramAudio(url);
        if (fallbackAudio) audioResult = { quality: 'MP3', url: fallbackAudio };
    }

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

    // Extract the account that published the post from common Instagram/provider
    // metadata shapes. Keep the username as the primary display value.
    const findOwner = (object, depth = 0) => {
        if (!object || typeof object !== 'object' || depth > 5) return '';
        const ownerKeys = ['owner', 'user', 'author', 'uploader', 'account', 'profile'];
        for (const key of ownerKeys) {
            const candidate = object[key];
            if (candidate && typeof candidate === 'object') {
                const username = candidate.username || candidate.userName || candidate.handle ||
                    candidate.unique_id || candidate.uniqueId || candidate.full_name || candidate.fullName ||
                    candidate.name;
                if (typeof username === 'string' && username.trim()) return username.trim();
            } else if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
            }
        }
        for (const value of Object.values(object)) {
            if (value && typeof value === 'object') {
                const found = findOwner(value, depth + 1);
                if (found) return found;
            }
        }
        return '';
    };
    const owner = findOwner(media) || findOwner(payload);

    return {
        title: String(title).slice(0, 180),
        owner: String(owner || '').slice(0, 80),
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
