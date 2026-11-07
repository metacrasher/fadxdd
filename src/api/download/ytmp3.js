const fetch = require('node-fetch');

function getYoutubeId(value) {
    try {
        const parsed = new URL(value);
        if (parsed.hostname.includes('youtu.be')) return parsed.pathname.split('/').filter(Boolean)[0];
        return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
    } catch {
        return null;
    }
}

async function convertYoutube(url, format) {
    const id = getYoutubeId(url);
    if (!id || !/^[\w-]{11}$/.test(id)) throw new Error('Link YouTube tidak valid.');
    const headers = {
        accept: '*/*',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: 'https://id.ytmp3.mobi/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    };
    const initialResponse = await fetch(`https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=${Date.now()}`, { headers, timeout: 15000 });
    if (!initialResponse.ok) throw new Error(`Provider init gagal (HTTP ${initialResponse.status}).`);
    const init = await initialResponse.json();
    if (!init.convertURL) throw new Error('Provider tidak mengembalikan URL konversi.');
    const convertResponse = await fetch(`${init.convertURL}&v=${id}&f=${format}&_=${Date.now()}`, { headers, timeout: 20000 });
    if (!convertResponse.ok) throw new Error(`Konversi gagal (HTTP ${convertResponse.status}).`);
    const convert = await convertResponse.json();
    if (!convert.downloadURL || !convert.progressURL) throw new Error('Provider gagal membuat tautan unduhan.');
    let info = {};
    for (let attempt = 0; attempt < 12; attempt++) {
        const progressResponse = await fetch(convert.progressURL, { headers, timeout: 15000 });
        if (!progressResponse.ok) throw new Error('Gagal memeriksa proses konversi.');
        info = await progressResponse.json();
        if (info.progress === 3 || info.progress === 100) break;
        if (info.error) throw new Error(info.error);
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    if (info.progress !== 3 && info.progress !== 100) throw new Error('Konversi belum selesai. Silakan coba lagi.');
    return { title: info.title || 'YouTube media', format, url: convert.downloadURL };
}

module.exports = function (app) {
    app.get('/download/ytmp3', async (req, res) => {
        try {
            if (!req.query.url) return res.status(400).json({ status: false, message: 'Parameter url wajib diisi.' });
            const result = await convertYoutube(req.query.url, 'mp3');
            return res.status(200).json({ status: true, result });
        } catch (error) {
            console.error('[YTMP3]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider MP3 sedang bermasalah.' });
        }
    });

    app.get('/download/ytmp4', async (req, res) => {
        try {
            if (!req.query.url) return res.status(400).json({ status: false, message: 'Parameter url wajib diisi.' });
            const result = await convertYoutube(req.query.url, 'mp4');
            return res.status(200).json({ status: true, result });
        } catch (error) {
            console.error('[YTMP4]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider MP4 sedang bermasalah.' });
        }
    });
};
