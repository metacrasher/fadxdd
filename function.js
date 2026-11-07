
const axios = require('axios');
const moment = require('moment-timezone');

function tanggal(numer) {
    const myMonths = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];

    const myDays = [
        'Minggu', 'Senin', 'Selasa', 'Rabu',
        'Kamis', 'Jum’at', 'Sabtu'
    ];

    const tgl = new Date(numer);

    const day = tgl.getDate();
    const bulan = tgl.getMonth();
    const thisDay = myDays[tgl.getDay()];
    const year = tgl.getFullYear();

    return `${thisDay}, ${day}/${myMonths[bulan]}/${year}`;
}

const capital = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const getBuffer = async (url, options = {}) => {
    const res = await axios({
        method: 'GET',
        url,
        headers: {
            'DNT': '1',
            'Upgrade-Insecure-Request': '1'
        },
        ...options,
        responseType: 'arraybuffer'
    });

    return res.data;
};

const fetchJson = async (url, options = {}) => {
    const res = await axios({
        method: 'GET',
        url,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/95.0.4638.69 Safari/537.36'
        },
        ...options
    });

    return res.data;
};

const runtime = (seconds = process.uptime()) => {
    seconds = Number(seconds);

    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return [
        d > 0 ? `${d}d` : '',
        h > 0 ? `${h}h` : '',
        m > 0 ? `${m}m` : '',
        s > 0 ? `${s}s` : ''
    ].filter(Boolean).join(' ');
};

global.tanggal = tanggal;
global.capital = capital;
global.getBuffer = getBuffer;
global.fetchJson = fetchJson;
global.runtime = runtime;
global.totalreq = global.totalreq || 0;
