const { ytdlv2, ytmp3, ytmp4 } = require('@vreden/youtube_scraper') 

module.exports = function (app) {
app.get('/download/ytdl-v2', async (req, res) => {
       const { url } = req.query
        try {
            if (!url) return res.status(400).json({ status: false, message: 'Parameter url wajib diisi.' });
            const anu = await ytdlv2(url);
            if (!anu || !anu.downloads) throw new Error('Provider tidak mengembalikan pilihan unduhan.');
            res.status(200).json({
                status: true,
                result: {
                metadata: anu.details, 
                download: anu.downloads
                }
            });
        } catch (error) {
            res.status(500).send(`Error: ${error.message}`);
        }
});
}