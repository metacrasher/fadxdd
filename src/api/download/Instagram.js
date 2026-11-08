const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');

function validInstagramUrl(value) {
    try {
        const u = new URL(value);
        return ['instagram.com', 'www.instagram.com', 'm.instagram.com'].includes(u.hostname) && /^\\/(p|reel|reels|tv)\\//.test(u.pathname);
    } catch { return false; }
}

async function igdl(url) {
    if (!validInstagramUrl(url)) throw new Error('Masukan link postingan atau Reels Instagram yang valid.');
    const response = await axios.post('https://instanavigation.app/api/ajaxSearch', qs.stringify({ q: url, t: 'media', lang: 'en' }), {
        timeout: 25000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0', Accept: 'application/json, text/javascript, */*; q=0.01', Referer: 'https://instanavigation.app/', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', Origin: 'https://instanavigation.app' }
    });
    const html = response.data?.data;
    if (typeof html !== 'string' || !html.trim()) throw new Error('Provider Instagram tidak mengembalikan data media.');
    const $ = cheerio.load(html);
    const downloadUrls = $('.download-items__btn a').map((_, el) => $(el).attr('href')).get().filter(Boolean);
    if (!downloadUrls.length) throw new Error('Media tidak ditemukan atau postingan tidak dapat diakses.');
    let title = 'Instagram media';
    try { title = new URLSearchParams(new URL(downloadUrls[0]).search).get('filename') || title; } catch {}
    return { title: title.replace(/\\.mp4$/i, ''), thumbnail: $('.download-items__thumb img').attr('src') || null, downloadUrls };
}

module.exports = function (app) {
    app.get('/download/instagram', async (req, res) => {
        try {
            const result = await igdl(String(req.query.url || '').trim());
            return res.status(200).json({ status: true, result });
        } catch (error) {
            return res.status(502).json({ status: false, message: error.message || 'Instagram provider sedang bermasalah.' });
        }
    });
};