const axios = require('axios');

function allowedHost(hostname) {
    const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
    return /(^|\.)savetube\.(vip|me|io)$/.test(host);
}

module.exports = function (app) {
    app.get('/download/youtube/file', async (req, res) => {
        let source;
        try { source = new URL(String(req.query.url || '')); }
        catch { return res.status(400).json({ status: false, message: 'Tautan file YouTube tidak valid.' }); }
        if (source.protocol !== 'https:' || !allowedHost(source.hostname)) {
            return res.status(400).json({ status: false, message: 'Host file YouTube tidak diizinkan.' });
        }

        const format = String(req.query.format || 'mp4').toLowerCase() === 'mp3' ? 'mp3' : 'mp4';
        const fallback = format === 'mp3' ? 'youtube-audio.mp3' : 'youtube-video.mp4';
        const filename = String(req.query.name || fallback).replace(/[\r\n"]/g, '').replace(/[^a-z0-9._() -]/gi, '_').slice(0, 160) || fallback;

        try {
            const upstream = await axios.get(source.href, {
                responseType: 'stream', timeout: 60000, maxRedirects: 5,
                maxContentLength: 200 * 1024 * 1024,
                headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://ytshorts.savetube.me/' },
                beforeRedirect: options => {
                    if ((options.protocol || 'https:') !== 'https:' || !allowedHost(options.hostname)) throw new Error('Redirect CDN YouTube tidak diizinkan.');
                }
            });
            const type = String(upstream.headers['content-type'] || '').split(';')[0].toLowerCase();
            if (!type.startsWith('audio/') && !type.startsWith('video/') && type !== 'application/octet-stream') {
                upstream.data.destroy();
                return res.status(502).json({ status: false, message: 'Provider tidak mengirim file media.' });
            }
            res.status(200);
            res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
            res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
            upstream.data.on('error', error => { console.error('[YOUTUBE-FILE]', error.message); if (!res.headersSent) res.status(502); res.end(); });
            return upstream.data.pipe(res);
        } catch (error) {
            console.error('[YOUTUBE-FILE]', error.message);
            if (!res.headersSent) return res.status(502).json({ status: false, message: 'Gagal mengambil file dari CDN YouTube.' });
            return res.end();
        }
    });
};
