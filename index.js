
const express = require('express');
const chalk = require('chalk');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

require('./function.js');

const app = express();

app.enable('trust proxy');
app.set('json spaces', 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Static files
app.use('/', express.static(path.join(__dirname, 'api-page')));
app.use('/src', express.static(path.join(__dirname, 'src')));

// Settings
const settingsPath = path.join(__dirname, 'src', 'settings.json');

if (!fs.existsSync(settingsPath)) {
    throw new Error('src/settings.json tidak ditemukan!');
}

const settings = JSON.parse(
    fs.readFileSync(settingsPath, 'utf-8')
);

if (!settings.apiSettings) {
    throw new Error('apiSettings tidak ditemukan di settings.json!');
}

global.apikey = settings.apiSettings.apikey;
global.totalreq = global.totalreq || 0;

// Request middleware
app.use((req, res, next) => {
    console.log(
        chalk.bgHex('#FFFF99').hex('#333').bold(
            ` Request Route: ${req.path} `
        )
    );

    global.totalreq += 1;

    const originalJson = res.json;

    res.json = function (data) {
        if (data && typeof data === 'object') {
            const responseData = {
                status: data.status,
                creator: settings.apiSettings.creator || 'Created Using Skyzo',
                ...data
            };

            return originalJson.call(this, responseData);
        }

        return originalJson.call(this, data);
    };

    next();
});


// API Routes
let totalRoutes = 0;
let failedRoutes = [];

const apiFolder = path.join(__dirname, 'src', 'api');

if (!fs.existsSync(apiFolder)) {
    throw new Error('Folder src/api tidak ditemukan!');
}

fs.readdirSync(apiFolder).forEach((subfolder) => {
    const subfolderPath = path.join(apiFolder, subfolder);

    if (!fs.statSync(subfolderPath).isDirectory()) return;

    fs.readdirSync(subfolderPath).forEach((file) => {
        const filePath = path.join(subfolderPath, file);

        if (path.extname(file) !== '.js') return;

        try {
            console.log(`[ROUTE CHECK] Loading: ${subfolder}/${file}`);

            const route = require(filePath);

            if (typeof route !== 'function') {
                throw new Error('Route harus mengekspor function!');
            }

            route(app);
            totalRoutes++;

            console.log(`[ROUTE OK] ${subfolder}/${file}`);
        } catch (error) {
            failedRoutes.push({
                file: `${subfolder}/${file}`,
                error: error.message
            });

            console.error(
                `[ROUTE LOAD ERROR] ${subfolder}/${file}`,
                error.stack || error
            );
        }
    });
});

console.log(`[ROUTE SUMMARY] Berhasil: ${totalRoutes}`);
console.log(`[ROUTE SUMMARY] Gagal: ${failedRoutes.length}`);

if (failedRoutes.length > 0) {
    console.error('[FAILED ROUTES]', JSON.stringify(failedRoutes));
}

// Homepage
app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'api-page', 'index.html')
    );
});

// Error handler
app.use((err, req, res, next) => {
    console.error('APPLICATION ERROR:', err.stack || err);

    const errorPage = path.join(
        __dirname,
        'api-page',
        '500.html'
    );

    if (fs.existsSync(errorPage)) {
        return res.status(500).sendFile(errorPage);
    }

    res.status(500).send('Internal Server Error');
});

// 404 handler
app.use((req, res) => {
    const notFoundPage = path.join(
        __dirname,
        'api-page',
        '404.html'
    );

    if (fs.existsSync(notFoundPage)) {
        return res.status(404).sendFile(notFoundPage);
    }

    res.status(404).send('404 - Page Not Found');
});

// IMPORTANT:
// Vercel Serverless Function tidak membutuhkan app.listen()

module.exports = app;
