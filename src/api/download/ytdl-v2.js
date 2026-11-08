const fetch = require('node-fetch');

function getYoutubeId(value) {
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host) && !host.endsWith('.youtube.com')) return null;
        if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
        return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || null;
    } catch { return null; }
}

module.exports = function (app) {
    app.get('/download/ytdl-v2', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            const id = getYoutubeId(url);
            if (!id || !/^[\w-]{11}$/.test(id)) return res.status(400).json({ status: false, message: 'Masukan link youtube yang valid.' });
            const headers = { accept: '*/*', Referer: 'https://id.ytmp3.mobi/', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36' };
            const initResponse = await fetch('https://d.ymcdn.org/api/v1/init?p=y&23=1llum1n471&_=' + Date.now(), { headers, timeout: 15000 });
            if (!initResponse.ok) throw new Error('Provider YouTube init gagal (HTTP ' + initResponse.status + ').');
            const init = await initResponse.json();
            if (!init.convertURL) throw new Error('Provider YouTube tidak menyediakan konversi saat ini.');
            const convertResponse = await fetch(init.convertURL + '&v=' + id + '&f=mp4&_=' + Date.now(), { headers, timeout: 20000 });
            if (!convertResponse.ok) throw new Error('Konversi video gagal (HTTP ' + convertResponse.status + ').');
            const converted = await convertResponse.json();
            if (!converted.downloadURL || !converted.progressURL) throw new Error('Provider gagal membuat tautan video.');
            let info = {};
            for (let attempt = 0; attempt < 12; attempt++) {
                const progress = await fetch(converted.progressURL, { headers, timeout: 15000 });
                if (!progress.ok) throw new Error('Gagal memeriksa proses konversi.');
                info = await progress.json();
                if (info.progress === 3 || info.progress === 100) break;
                if (info.error) throw new Error(info.error);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            if (info.progress !== 3 && info.progress !== 100) throw new Error('Konversi belum selesai. Silakan coba lagi.');
            return res.status(200).json({ status: true, result: { metadata: { title: info.title || 'YouTube video' }, download: [{ quality: 'MP4', format: 'mp4', url: converted.downloadURL }] } });
        } catch (error) {
            console.error('[YTDL-V2]', error.message);
            return res.status(502).json({ status: false, message: error.message || 'Provider YouTube sedang bermasalah.' });
        }
    });
};