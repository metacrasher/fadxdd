
/* =========================================
   FADXD API SYSTEM
   Profile Drawer + Settings + API Renderer
========================================= */

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    const loadingScreen = document.getElementById('loadingScreen');
    const apiContent = document.getElementById('apiContent');

    try {
        // Load website configuration
        const response = await fetch('/src/settings.json', {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(
                `Gagal mengambil settings.json. HTTP ${response.status}`
            );
        }

        const settings = await response.json();

        if (!settings || !Array.isArray(settings.categories)) {
            throw new Error('Struktur settings.json tidak valid.');
        }

        // Render website
        renderWebsite(settings);
        renderLinks(settings.links || []);
        renderCategories(settings.categories);

        // Activate features
        initProfileDrawer();
        initSearch();
        initApiModal();

        console.log('[FadXD API] Website berhasil diinisialisasi.');
        console.log('[FadXD API] Total kategori:', settings.categories.length);

    } catch (error) {
        console.error('[FadXD API] Initialization error:', error);

        if (apiContent) {
            apiContent.innerHTML = `
                <div class="alert alert-danger">
                    <strong>API SYSTEM ERROR</strong>
                    <p class="mb-0 mt-2">${escapeHTML(error.message)}</p>
                    <small>Periksa file /src/settings.json dan koneksi website.</small>
                </div>
            `;
        }
    } finally {
        // Always remove loading screen, even if initialization fails
        if (loadingScreen) {
            loadingScreen.classList.add('loaded');

            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 350);
        }
    }
}


/* =========================================
   SAFE HTML
========================================= */

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}


/* =========================================
   WEBSITE INFORMATION
========================================= */

function renderWebsite(settings) {
    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value ?? '';
    };

    document.title = settings.name || 'FadXD API';

    setText('page', settings.name || 'FadXD API');
    setText('header', settings.name || 'FadXD API');
    setText('name', settings.name || 'FadXD API');
    setText('version', settings.version || '');
    setText('versionHeader', settings.version || '');
    setText('description', settings.description || '');

    const watermark = document.getElementById('wm');

    if (watermark) {
        watermark.textContent =
            `© ${new Date().getFullYear()} ${settings.apiSettings?.creator || 'FadXD'}`;
    }

    // Optional banner: only display if a valid banner path exists
    const banner = document.getElementById('dynamicImage');

    if (banner) {
        const bannerPath =
            settings.banner ||
            settings.image ||
            settings.apiSettings?.banner ||
            '';

        if (bannerPath) {
            banner.src = bannerPath;
            banner.style.display = 'block';

            banner.onerror = () => {
                banner.style.display = 'none';
            };
        } else {
            banner.style.display = 'none';
        }
    }
}


/* =========================================
   WEBSITE LINKS
========================================= */

function renderLinks(links) {
    const container = document.getElementById('apiLinks');
    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(links) || links.length === 0) return;

    links.forEach(link => {
        if (!link || !link.url) return;

        const anchor = document.createElement('a');

        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.className = 'api-link';
        anchor.textContent = link.name || 'Open Link';

        container.appendChild(anchor);
    });
}


/* =========================================
   API CATEGORY RENDERER
========================================= */

function renderCategories(categories) {
    const container = document.getElementById('apiContent');
    if (!container) return;
    container.innerHTML = '';

    categories.forEach((category, categoryIndex) => {
        if (!category || !Array.isArray(category.items)) return;
        const section = document.createElement('section');
        section.className = 'api-category mb-5';
        section.dataset.category = category.name || '';
        const heading = document.createElement('div');
        heading.className = 'category-heading mb-3';
        const title = document.createElement('h3');
        title.className = 'category-title';
        title.textContent = category.name || `Category ${categoryIndex + 1}`;
        const count = document.createElement('span');
        count.className = 'category-count';
        count.textContent = `${category.items.length} SERVICES`;
        heading.append(title, count);
        const grid = document.createElement('div');
        grid.className = 'api-grid';

        category.items.forEach(item => {
            if (!item || !item.path) return;
            const card = document.createElement('article');
            card.className = 'api-item';
            card.dataset.name = String(item.name || '').toLowerCase();
            card.dataset.desc = String(item.desc || '').toLowerCase();
            card.dataset.path = String(item.path || '').toLowerCase();
            card.dataset.category = String(category.name || '').toLowerCase();
            const top = document.createElement('div');
            top.className = 'api-item-top';
            const method = document.createElement('span');
            method.className = 'api-method';
            method.setAttribute('aria-label', item.name || 'API');
            const appLogos = {
                status: {
                    label: 'Status server',
                    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 20V4"/></svg>'
                },
                cekstatus: {
                    label: 'Status pembayaran',
                    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/></svg>'
                },
                instagram: { src: 'https://cdn.simpleicons.org/instagram/E4405F', alt: 'Instagram' },
                spotify: { src: 'https://cdn.simpleicons.org/spotify/1DB954', alt: 'Spotify' },
                tiktok: { src: 'https://cdn.simpleicons.org/tiktok/FFFFFF', alt: 'TikTok' },
                youtube: { src: 'https://cdn.simpleicons.org/youtube/FF0033', alt: 'YouTube' }
            };
            const appLogo = appLogos[item.id];
            if (appLogo?.svg) {
                method.setAttribute('aria-label', appLogo.label);
                method.innerHTML = appLogo.svg;
                method.classList.add('api-method-symbol');
            } else if (appLogo?.src) {
                const logo = document.createElement('img');
                logo.className = 'api-method-logo';
                logo.src = appLogo.src;
                logo.alt = appLogo.alt;
                logo.loading = 'lazy';
                logo.referrerPolicy = 'no-referrer';
                logo.onerror = () => {
                    logo.remove();
                    method.textContent = 'GET';
                    method.classList.add('api-method-fallback');
                };
                method.appendChild(logo);
            } else {
                method.textContent = 'GET';
            }
            const endpointName = document.createElement('h4');
            endpointName.className = 'api-item-name';
            endpointName.textContent = item.name || 'API Service';
            top.append(method, endpointName);

            const status = document.createElement('span');
            status.className = 'api-health is-unknown';
            status.innerHTML = '<i></i><span>Belum dicek</span>';
            status.dataset.healthFor = item.id || item.name;

            const description = document.createElement('p');
            description.className = 'api-item-desc';
            description.textContent = item.desc || 'Gunakan layanan ini langsung dari dashboard.';
            const footer = document.createElement('div');
            footer.className = 'api-item-footer';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'api-open-button';
            button.textContent = item.id === 'status' ? 'Cek Status Server' : 'Buka Layanan';
            button.addEventListener('click', () => openApiModal(item));
            footer.appendChild(button);
            card.append(top, status, description, footer);
            grid.appendChild(card);
        });
        section.append(heading, grid);
        container.appendChild(section);
    });

    // Real server status is checked on page load; other integrations turn green only
    // after a successful real request, never from a hard-coded "online" label.
    checkServerHealth();
}

async function checkServerHealth() {
    const status = document.querySelector('[data-health-for="status"]');
    if (!status) return;
    try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        const data = await response.json();
        setApiHealth('status', response.ok && data?.status === true);
    } catch {
        setApiHealth('status', false);
    }
}

function setApiHealth(id, online) {
    const el = document.querySelector(`[data-health-for="${CSS.escape(id)}"]`);
    if (!el) return;
    el.classList.toggle('is-online', !!online);
    el.classList.toggle('is-offline', !online);
    el.classList.remove('is-unknown');
    const label = el.querySelector('span');
    if (label) label.textContent = online ? 'API AKTIF' : 'API ERROR';
}

/* =========================================
   PROFILE DRAWER SYSTEM
========================================= */

function initProfileDrawer() {
    const menuButton = document.getElementById('profileMenuButton');
    const drawer = document.getElementById('profileDrawer');
    const overlay = document.getElementById('profileOverlay');
    const closeButton = document.getElementById('closeProfileDrawer');
    const drawerYear = document.getElementById('drawerYear');

    if (drawerYear) {
        drawerYear.textContent = new Date().getFullYear();
    }

    if (!menuButton || !drawer || !overlay || !closeButton) {
        console.warn('[FadXD API] Profile drawer elements not found.');
        return;
    }

    const openDrawer = () => {
        drawer.classList.add('open');
        overlay.classList.add('show');
        menuButton.classList.add('active');
        document.body.classList.add('drawer-open');

        menuButton.setAttribute('aria-expanded', 'true');
        drawer.setAttribute('aria-hidden', 'false');
    };

    const closeDrawer = () => {
        drawer.classList.remove('open');
        overlay.classList.remove('show');
        menuButton.classList.remove('active');
        document.body.classList.remove('drawer-open');

        menuButton.setAttribute('aria-expanded', 'false');
        drawer.setAttribute('aria-hidden', 'true');
    };

    menuButton.addEventListener('click', () => {
        drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });

    closeButton.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeDrawer();
    });

    drawer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeDrawer);
    });
}


/* =========================================
   API SEARCH
========================================= */

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const container = document.getElementById('apiContent');

    if (!searchInput || !container) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();

        container.querySelectorAll('.api-category').forEach(section => {
            let visibleItems = 0;

            section.querySelectorAll('.api-item').forEach(item => {
                const searchableText = [
                    item.dataset.name,
                    item.dataset.desc,
                    item.dataset.path,
                    item.dataset.category
                ].join(' ');

                const matched = searchableText.includes(query);

                item.style.display = matched ? '' : 'none';

                if (matched) visibleItems++;
            });

            section.style.display = visibleItems > 0 ? '' : 'none';
        });
    });
}


/* =========================================
   API MODAL
========================================= */

let activeApiItem = null;
let apiModalInstance = null;

function initApiModal() {
    const modalElement = document.getElementById('apiResponseModal');

    if (!modalElement) {
        console.warn('[FadXD API] API modal not found.');
        return;
    }

    if (window.bootstrap?.Modal) {
        apiModalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    } else {
        console.error('[FadXD API] Bootstrap Modal is unavailable.');
    }

    const executeButton = document.getElementById('submitQueryBtn');

    if (executeButton) {
        executeButton.addEventListener('click', executeApiRequest);
    }

    modalElement.addEventListener('hidden.bs.modal', () => {
        activeApiItem = null;
        resetApiModal();
    });
}


function openApiModal(item) {
    activeApiItem = item;
    const title = document.getElementById('apiResponseModalLabel');
    const description = document.getElementById('apiResponseModalDesc');
    const endpoint = document.getElementById('apiEndpoint');
    const inputContainer = document.getElementById('apiQueryInputContainer');
    const responseContent = document.getElementById('apiResponseContent');
    if (!title || !endpoint || !inputContainer) return;

    title.textContent = item.name || 'API Service';
    description.textContent = item.desc || '';
    endpoint.textContent = '';
    endpoint.classList.add('d-none');
    inputContainer.innerHTML = '';
    if (responseContent) { responseContent.textContent = ''; responseContent.classList.add('d-none'); }

    const isYoutube = item.id === 'youtube';
    const isTikTok = item.id === 'tiktok';
    const parsedUrl = new URL(item.path, window.location.origin);
    const parameters = [...parsedUrl.searchParams.keys()];
    if (isYoutube || isTikTok) {
        const modeGroup = document.createElement('div');
        modeGroup.className = 'mb-3 api-input-group';
        modeGroup.innerHTML = '<label class="form-label" for="yt-mode">Format</label><select id="yt-mode" class="form-select"><option value="video">Video (MP4)</option><option value="audio">Musik (MP3)</option></select>';
        inputContainer.appendChild(modeGroup);
        if (isYoutube) {
            const qualityGroup = document.createElement('div');
            qualityGroup.className = 'mb-3 api-input-group';
            qualityGroup.innerHTML = '<label class="form-label" for="yt-quality">Resolusi video</label><select id="yt-quality" class="form-select"><option value="144">144p</option><option value="360" selected>360p</option><option value="480">480p</option><option value="720">720p</option><option value="1080">1080p</option></select>';
            inputContainer.appendChild(qualityGroup);
            document.getElementById('yt-mode').addEventListener('change', event => {
                qualityGroup.style.display = event.target.value === 'video' ? '' : 'none';
            });
        }
    }
    parameters.forEach((parameter, index) => {
        const group = document.createElement('div');
        group.className = 'mb-3 api-input-group';
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = parameter;
        label.htmlFor = `api-param-${index}`;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control api-param-input';
        input.id = `api-param-${index}`;
        input.dataset.parameter = parameter;
        input.placeholder = parameter === 'url' ? 'Tempel link video / postingan di sini' : `Masukkan ${parameter}...`;
        input.autocomplete = 'off';
        group.append(label, input);
        inputContainer.appendChild(group);
    });
    if (parameters.length === 0) {
        const note = document.createElement('p');
        note.className = 'small text-secondary';
        note.textContent = 'Status server akan diperiksa secara langsung.';
        inputContainer.appendChild(note);
    }
    if (apiModalInstance) apiModalInstance.show();
}

/* =========================================
   EXECUTE API REQUEST
========================================= */

function collectDownloadLinks(value, label = 'Download', output = [], seen = new Set()) {
    if (!value) return output;
    if (typeof value === 'string') {
        const isHttpUrl = value.startsWith('https://') || value.startsWith('http://') || value.startsWith('/download/youtube/file');
        const looksLikeMedia = /[.](mp3|mp4|m4a|webm|mkv|jpg|jpeg|png)(?:[?#]|$)/i.test(value);
        const downloadContext = /(download|video|audio|mp3|mp4|file|link|url)/i.test(label);
        if (isHttpUrl && (looksLikeMedia || downloadContext) && !/(thumbnail|avatar|cover|image)/i.test(label)) {
            if (!seen.has(value)) { seen.add(value); output.push({ label, url: value }); }
        }
        return output;
    }
    if (Array.isArray(value)) {
        value.forEach((entry, index) => collectDownloadLinks(entry, entry?.quality || entry?.format || `Pilihan ${index + 1}`, output, seen));
        return output;
    }
    if (typeof value === 'object') {
        if (typeof value.url === 'string') {
            collectDownloadLinks(value.url, value.quality || value.format || label, output, seen);
            return output;
        }
        Object.entries(value).forEach(([key, child]) => {
            const nextLabel = child && typeof child === 'object'
                ? (child.quality || child.format || child.label || key)
                : (typeof child === 'string' && (child.startsWith('http://') || child.startsWith('https://')) ? key : key);
            collectDownloadLinks(child, String(nextLabel), output, seen);
        });
    }
    return output;
}

function findMediaMetadata(data) {
    const root = data?.result || data;
    const metadata = root?.metadata || root?.details || root?.video || root;
    const findValue = (object, keys) => {
        if (!object || typeof object !== 'object') return '';
        for (const [key, value] of Object.entries(object)) {
            if (keys.test(key) && typeof value === 'string' && value.trim()) return value;
        }
        for (const value of Object.values(object)) {
            if (value && typeof value === 'object') {
                const found = findValue(value, keys);
                if (found) return found;
            }
        }
        return '';
    };
    return {
        title: metadata?.title || findValue(metadata, /^(title|name)$/i) || 'Video YouTube',
        thumbnail: findValue(metadata, /(thumbnail|thumb|image|cover)/i),
        duration: metadata?.duration || metadata?.timestamp || findValue(metadata, /(duration|timestamp|length)/i),
        author: metadata?.author?.name || metadata?.author || metadata?.channel || ''
    };
}

function renderApiResult(container, data, mode, quality) {
    container.innerHTML = '';
    if (mode === 'video' || mode === 'audio') {
        const info = findMediaMetadata(data);
        if (info.thumbnail && (info.thumbnail.startsWith('https://') || info.thumbnail.startsWith('http://'))) {
            const preview = document.createElement('section');
            preview.className = 'yt-video-preview';
            const image = document.createElement('img');
            image.className = 'yt-video-thumbnail';
            image.src = info.thumbnail;
            image.alt = 'Thumbnail video YouTube';
            image.loading = 'lazy';
            image.referrerPolicy = 'no-referrer';
            const text = document.createElement('div');
            text.className = 'yt-video-info';
            const title = document.createElement('h4');
            title.textContent = info.title;
            text.appendChild(title);
            const meta = [info.author, info.duration].filter(Boolean).join(' • ');
            if (meta) {
                const detail = document.createElement('p');
                detail.textContent = meta;
                text.appendChild(detail);
            }
            preview.append(image, text);
            container.appendChild(preview);
        }
    }

    if (activeApiItem?.id === 'tiktok') {
        const result = data?.result || {};
        const selectedMode = mode || document.getElementById('yt-mode')?.value || 'video';
        const options = selectedMode === 'audio'
            ? (result.audio ? [{ quality: 'MP3', url: result.audio.url }] : [])
            : (Array.isArray(result.video) ? result.video.map(v => ({ quality: v.quality || 'MP4', url: v.url })) : []);
        if (result.thumbnail) {
            const image = document.createElement('img');
            image.className = 'yt-video-thumbnail';
            image.src = result.thumbnail;
            image.alt = 'Thumbnail TikTok';
            container.appendChild(image);
        }
        const heading = document.createElement('p');
        heading.className = 'api-result-heading';
        heading.textContent = result.title || 'TikTok media';
        container.appendChild(heading);
        if (!options.length) {
            const note = document.createElement('p');
            note.className = 'small text-warning';
            note.textContent = selectedMode === 'audio' ? 'Audio MP3 tidak tersedia untuk video ini.' : 'Video MP4 tidak tersedia.';
            container.appendChild(note);
        }
        options.forEach(option => {
            const anchor = document.createElement('a');
            anchor.className = 'api-download-button';
            anchor.href = '/download/tiktok/file?url=' + encodeURIComponent(option.url) + '&name=' + encodeURIComponent((result.title || 'tiktok-media').slice(0, 80)) + (selectedMode === 'audio' ? '&format=mp3' : '&format=mp4');
            anchor.setAttribute('download', '');
            anchor.textContent = '⬇ Unduh ' + option.quality;
            container.appendChild(anchor);
        });
        return;
    }
    const links = collectDownloadLinks(data);
    const qualityRank = value => {
        const match = String(value).match(/(\d{3,4})\s*p/i);
        return match ? Number(match[1]) : 0;
    };
    if (mode === 'video' && quality && quality !== 'best') {
        const requested = Number.parseInt(quality, 10);
        const exact = links.filter(link => qualityRank(link.label) === requested);
        if (exact.length) {
            links.splice(0, links.length, ...exact);
        } else {
            const available = links.filter(link => qualityRank(link.label) > 0);
            if (available.length) {
                const lowerOrEqual = available.filter(link => qualityRank(link.label) <= requested);
                const chosen = lowerOrEqual.sort((a, b) => qualityRank(b.label) - qualityRank(a.label))[0]
                    || available.sort((a, b) => qualityRank(a.label) - qualityRank(b.label))[0];
                links.splice(0, links.length, chosen);
                const note = document.createElement('p');
                note.className = 'small text-warning mt-2';
                note.textContent = exact.length ? '' : 'Kualitas persis tidak tersedia; ditampilkan kualitas terdekat yang tersedia.';
                container.appendChild(note);
            }
        }
    } else if (mode === 'video' && quality === 'best') {
        const available = links.filter(link => qualityRank(link.label) > 0);
        if (available.length) {
            const best = available.sort((a, b) => qualityRank(b.label) - qualityRank(a.label))[0];
            links.splice(0, links.length, best);
        }
    }

    if (links.length) {
        const heading = document.createElement('p');
        heading.className = 'api-result-heading';
        heading.textContent = mode === 'audio' ? 'Musik siap diunduh' : 'Pilih file untuk diunduh';
        container.appendChild(heading);
        links.forEach((link, index) => {
            const anchor = document.createElement('a');
            anchor.className = 'api-download-button';
            anchor.href = link.url;
            anchor.removeAttribute('target');
            anchor.removeAttribute('rel');
            anchor.setAttribute('download', '');
            anchor.textContent = mode === 'audio' ? '⬇ Unduh Musik MP3' : `⬇ Unduh Video ${link.label || (index + 1)}`;
            container.appendChild(anchor);
        });
    }
    // Keep provider/CDN URLs out of the visible result for successful media downloads.
    if ((mode === 'audio' || mode === 'video') && links.length) return;

    const details = document.createElement('details');
    details.className = 'api-raw-result';
    const summary = document.createElement('summary');
    summary.textContent = 'Lihat detail respons API';
    const pre = document.createElement('pre');
    pre.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    details.append(summary, pre);
    container.appendChild(details);
    if (!links.length) {
        const note = document.createElement('p');
        note.className = 'small text-warning mt-2';
        note.textContent = 'Respons diterima, tetapi API tidak mengembalikan tautan unduhan yang dikenali.';
        container.prepend(note);
    }
}
function cleanApiErrorMessage(value) {
    let message = String(value ?? '').trim();

    // Hide HTTP status codes (for example 400, 404, 500, 504) from user-facing alerts.
    message = message
        .replace(/\bHTTP\s*[45]\d{2}\b\s*:?[ \t]*/gi, '')
        .replace(/\b[45]\d{2}\b\s*:\s*/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Avoid showing a bare technical error label when the code was the only detail.
    message = message.replace(/^(?:error|eror)\s*:?\s*/i, '');
    return message || 'Terjadi gangguan pada server. Silakan coba lagi nanti.';
}

async function executeApiRequest() {
    if (!activeApiItem) return;
    const executeButton = document.getElementById('submitQueryBtn');
    const loading = document.getElementById('apiResponseLoading');
    const responseContent = document.getElementById('apiResponseContent');
    if (!executeButton || !responseContent) return;

    const item = activeApiItem;
    const originalButtonText = executeButton.textContent;
    executeButton.disabled = true;
    executeButton.textContent = 'Memproses...';
    if (loading) loading.classList.remove('d-none');
    responseContent.classList.add('d-none');
    responseContent.innerHTML = '';

    let responseStatus = null;
    let serverFailure = false;

    try {
        let url = new URL(item.path, window.location.origin);
        document.querySelectorAll('#apiQueryInputContainer .api-param-input').forEach(input => {
            url.searchParams.set(input.dataset.parameter, input.value.trim());
        });
        [...url.searchParams.entries()].forEach(([key, value]) => { if (!value) url.searchParams.delete(key); });

        let mode = '';
        let quality = '';
        if (item.id === 'youtube' || item.id === 'tiktok') {
            mode = document.getElementById('yt-mode')?.value || 'video';
            quality = item.id === 'youtube' && mode === 'video'
                ? (document.getElementById('yt-quality')?.value || '360')
                : 'best';
            const videoUrl = url.searchParams.get('url');
            if (!videoUrl) throw new Error(item.id === 'youtube' ? 'Masukan link youtube yang valid.' : 'Masukan link TikTok yang valid.');
            if (item.id === 'youtube') {
                const selectedQuality = document.getElementById('yt-quality')?.value || '360';
                url = new URL(mode === 'audio' ? '/download/ytmp3' : '/download/ytdl-v2', window.location.origin);
                if (mode === 'video') url.searchParams.set('quality', selectedQuality);
            }
            url.searchParams.set('url', videoUrl);
        }

        for (const input of document.querySelectorAll('#apiQueryInputContainer .api-param-input')) {
            if (!input.value.trim()) throw new Error(`Kolom ${input.dataset.parameter} wajib diisi.`);
        }

        const response = await fetch(url.href, { method: 'GET', headers: { Accept: 'application/json, text/plain, */*' }, signal: AbortSignal.timeout(60000) });
        responseStatus = response.status;
        serverFailure = response.status >= 500 || response.status === 429;
        const contentType = response.headers.get('content-type') || '';
        const raw = await response.text();
        let data;
        try { data = contentType.includes('json') || /^[\s]*[\[{]/.test(raw) ? JSON.parse(raw) : raw; }
        catch { data = raw; }

        responseContent.classList.remove('d-none');
        if (!response.ok || data?.status === false) {
            // Client/input errors (4xx, except throttling) must not mark a healthy API red.
            // A 5xx/429 or an explicit provider/server failure is a technical failure.
            serverFailure = serverFailure || response.status >= 500 || response.status === 429 ||
                (response.status >= 200 && response.status < 300 && data?.status === false);
            throw new Error(`HTTP ${response.status}: ${typeof data === 'string' ? data : (data?.message || data?.error || JSON.stringify(data))}`);
        }
        renderApiResult(responseContent, data, mode, quality);
        setApiHealth(item.id || item.name, true);
    } catch (error) {
        responseContent.classList.remove('d-none');
        const message = document.createElement('p');
        message.className = 'api-error-message';
        message.textContent = error.name === 'TimeoutError' ? 'Request timeout. Coba lagi beberapa saat.' : cleanApiErrorMessage(error.message);
        responseContent.appendChild(message);
        // Missing/invalid user input and ordinary HTTP 4xx responses are not API outages.
        // Only server-side failures, throttling, timeouts, or network failures turn the indicator red.
        const isNetworkFailure = error instanceof TypeError || error.name === 'TimeoutError' ||
            error.name === 'NetworkError' || error.name === 'AbortError';
        if (serverFailure || isNetworkFailure) {
            setApiHealth(item.id || item.name, false);
        } else if (responseStatus === null) {
            // Validation failed before the request reached the server: preserve the current color.
        }
        console.error('[FadXD API] Request error:', error);
    } finally {
        if (loading) loading.classList.add('d-none');
        executeButton.disabled = false;
        executeButton.textContent = originalButtonText;
    }
}

/* =========================================
   RESET MODAL
========================================= */

function resetApiModal() {
    const loading = document.getElementById('apiResponseLoading');
    const responseContent = document.getElementById('apiResponseContent');

    if (loading) loading.classList.add('d-none');

    if (responseContent) {
        responseContent.classList.add('d-none');
        responseContent.textContent = '';
    }
}
