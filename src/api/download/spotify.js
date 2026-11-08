const fetch = require('node-fetch');

function validSpotifyUrl(value) {
    try {
        const u = new URL(value);
        return (['open.spotify.com', 'www.open.spotify.com'].includes(u.hostname) && /\\/(track|album|playlist|episode|show)\\//.test(u.pathname)) || u.hostname === 'spotify.link';
    } catch { return false; }
}

module.exports = function (app) {
    app.get('/download/spotify', async (req, res) => {
        try {
            const url = String(req.query.url || '').trim();
            if (!validSpotifyUrl(url)) return res.status(400).json({ status: false, message: 'Masukan link Spotify yang valid.' });
            const response = await fetch('https://spotifydown.app/api/download?link=' + encodeURIComponent(url), { headers: { Referer: 'https://spotifydown.app/' }, timeout: 25000 });
            if (!response.ok) throw new Error('Spotify provider gagal (HTTP ' + response.status + ').');
            const data = await response.json();
            const link = data?.data?.link;
            if (typeof link !== 'string' || !/^https?:\\/\\//i.test(link)) throw new Error(data?.message || 'Tautan unduhan Spotify tidak tersedia untuk konten ini.');
            return res.status(200).json({ status: true, result: link });
        } catch (error) {
            return res.status(502).json({ status: false, message: error.message || 'Spotify provider sedang bermasalah.' });
        }
    });
};