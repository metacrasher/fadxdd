
/* =========================================
   FADXD API SYSTEM
   Profile Drawer + Settings + API Renderer
========================================= */

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    const loadingScreen = document.getElementById('loadingScreen');
    const apiContent = document.getElementById('apiContent');
    const settingsController = new AbortController();
    const settingsTimeout = setTimeout(() => settingsController.abort(), 15000);

    try {
        // Load website configuration
        const response = await fetch('/src/settings.json', {
            cache: 'no-store',
            signal: settingsController.signal
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
        if (error?.name === 'AbortError') {
            error = new Error('Waktu tunggu memuat konfigurasi habis. Periksa koneksi atau server, lalu muat ulang halaman.');
        }
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
        clearTimeout(settingsTimeout);
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
            const knownActive = ['tiktok', 'youtube'].includes(item.id);
            status.className = 'api-health ' + (knownActive ? 'is-online' : 'is-unknown');
            status.innerHTML = '<i></i><span>' + (knownActive ? 'AKTIF' : 'Belum dicek') + '</span>';
            status.dataset.healthFor = item.id || item.name;

            const description = document.createElement('p');
            description.className = 'api-item-desc';
            description.textContent = item.desc || 'Gunakan layanan ini langsung dari dashboard.';
            const footer = document.createElement('div');
            footer.className = 'api-item-footer';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'api-open-button';
            button.textContent = item.id === 'status' ? 'Cek Status Server' : ['instagram', 'spotify', 'tiktok', 'youtube'].includes(item.id) ? 'Unduh Sekarang' : 'Buka Layanan';
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
    if (label) label.textContent = online ? (['tiktok', 'youtube'].includes(id) ? 'AKTIF' : 'API AKTIF') : 'API ERROR';
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
let apiModalSession = 0;
let apiRequestInProgress = false;

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
    apiModalSession++;
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
    const isInstagram = item.id === 'instagram';
    const parsedUrl = new URL(item.path, window.location.origin);
    const parameters = [...parsedUrl.searchParams.keys()];
    if (isYoutube || isTikTok || isInstagram) {
        const modeGroup = document.createElement('div');
        modeGroup.className = 'mb-3 api-input-group';
        modeGroup.innerHTML = '<label class="form-label" for="yt-mode">Format</label><select id="yt-mode" class="form-select"><option value="video">Video (MP4)</option><option value="audio">Musik (MP3)</option></select>';
        inputContainer.appendChild(modeGroup);
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

    let qualityGroup = null;
    let metadataTimer;
    let metadataRequestId = 0;
    let youtubePreviewGroup = null;
    const executeButton = document.getElementById('submitQueryBtn');
    const urlInput = inputContainer.querySelector('.api-param-input[data-parameter="url"]');

    // Remove stale validation/error output as soon as the user edits a YouTube URL.
    if (isYoutube && urlInput) {
        urlInput.addEventListener('input', () => {
            const responseContent = document.getElementById('apiResponseContent');
            if (responseContent?.querySelector('.api-error-message')) {
                responseContent.textContent = '';
                responseContent.classList.add('d-none');
            }
        });
    }

    if (isYoutube) {
        if (executeButton) executeButton.disabled = true;
        youtubePreviewGroup = document.createElement('section');
        youtubePreviewGroup.className = 'yt-video-preview d-none';
        youtubePreviewGroup.id = 'yt-video-preview';
        const previewImage = document.createElement('img');
        previewImage.className = 'yt-video-thumbnail';
        previewImage.alt = 'Thumbnail video YouTube';
        previewImage.loading = 'lazy';
        const previewInfo = document.createElement('div');
        previewInfo.className = 'yt-video-info';
        const previewTitle = document.createElement('h4');
        previewTitle.id = 'yt-video-preview-title';
        const previewMeta = document.createElement('p');
        previewMeta.id = 'yt-video-preview-meta';
        previewInfo.append(previewTitle, previewMeta);
        youtubePreviewGroup.append(previewImage, previewInfo);
        const urlGroup = urlInput?.closest('.api-input-group');
        if (urlGroup?.parentNode) urlGroup.parentNode.insertBefore(youtubePreviewGroup, urlGroup.nextSibling);
        qualityGroup = document.createElement('div');
        qualityGroup.className = 'mb-3 api-input-group';
        qualityGroup.id = 'yt-quality-group';
        qualityGroup.style.display = 'none';
        qualityGroup.innerHTML = '<label class="form-label" for="yt-quality">Resolusi video</label><select id="yt-quality" class="form-select"><option value="144">144p</option><option value="360" selected>360p (bawaan)</option><option value="480">480p</option><option value="720">720p</option><option value="1080">1080p</option></select><small id="yt-quality-status" class="form-text text-secondary">Masukkan link YouTube untuk memuat informasi video.</small>';
        inputContainer.appendChild(qualityGroup);

        const modeSelect = document.getElementById('yt-mode');
        const loadYoutubeInfo = async () => {
            const value = urlInput?.value.trim() || '';
            const requestId = ++metadataRequestId;
            clearTimeout(metadataTimer);
            if (!value) {
                qualityGroup.style.display = 'none';
                youtubePreviewGroup?.classList.add('d-none');
                if (executeButton) executeButton.disabled = true;
                return;
            }
            let parsed;
            try {
                parsed = new URL(value);
                if (!['http:', 'https:'].includes(parsed.protocol) ||
                    !/(^|\.)((youtube\.com)|(youtu\.be))$/i.test(parsed.hostname)) {
                    throw new Error('URL bukan YouTube');
                }
            } catch {
                qualityGroup.style.display = 'none';
                youtubePreviewGroup?.classList.add('d-none');
                // Keep Execute available for non-empty invalid input so validation is visible.
                if (executeButton) executeButton.disabled = !value;
                const status = document.getElementById('yt-quality-status');
                if (status) status.textContent = 'Masukkan link YouTube yang valid (youtube.com atau youtu.be).';
                return;
            }

            const isVideoMode = modeSelect.value === 'video';
            qualityGroup.style.display = isVideoMode ? '' : 'none';
            if (executeButton) executeButton.disabled = true;
            const status = document.getElementById('yt-quality-status');
            if (status) status.textContent = 'Memeriksa video YouTube...';
            try {
                const response = await fetch('/download/youtube/info?url=' + encodeURIComponent(value), {
                    headers: { Accept: 'application/json' },
                    signal: AbortSignal.timeout(20000)
                });
                const data = await response.json();
                if (requestId !== metadataRequestId) return;
                if (!response.ok || data?.status !== true) throw new Error(data?.message || 'Informasi video tidak tersedia.');
                const title = data.result?.title || 'Video YouTube';
                const thumbnail = data.result?.thumbnail || '';
                if (!thumbnail) throw new Error('Thumbnail video tidak tersedia.');
                const image = youtubePreviewGroup?.querySelector('img');
                if (image) image.src = thumbnail;
                const previewTitle = document.getElementById('yt-video-preview-title');
                if (previewTitle) previewTitle.textContent = title;
                const previewMeta = document.getElementById('yt-video-preview-meta');
                if (previewMeta) previewMeta.textContent = isVideoMode
                    ? 'Preview MP4 siap • Pilih resolusi, lalu tekan tombol proses.'
                    : 'Preview MP3 siap • Tekan tombol proses untuk mengunduh audio.';
                youtubePreviewGroup?.classList.remove('d-none');
                if (status) status.textContent = 'Preview video berhasil dimuat.';
                if (executeButton) executeButton.disabled = false;
                const quality = document.getElementById('yt-quality');
                if (isVideoMode && quality && data.result?.recommendedQuality) {
                    quality.value = String(data.result.recommendedQuality);
                }
            } catch (error) {
                if (requestId !== metadataRequestId) return;
                youtubePreviewGroup?.classList.add('d-none');
                if (executeButton) executeButton.disabled = true;
                if (status) status.textContent = 'Preview belum tersedia. Periksa link YouTube dan coba lagi.';
            }
        };
        urlInput?.addEventListener('input', () => {
            clearTimeout(metadataTimer);
            metadataRequestId++;
            youtubePreviewGroup?.classList.add('d-none');
            if (executeButton) executeButton.disabled = true;
            metadataTimer = setTimeout(loadYoutubeInfo, 650);
        });
        urlInput?.addEventListener('change', loadYoutubeInfo);

    }

    // Every downloader with a format selector starts fresh after a format switch.
    // This resets only the form/result UI; API request and download logic stay unchanged.
    if (isYoutube || isTikTok || isInstagram) {
        const modeSelect = document.getElementById('yt-mode');
        const urlInput = inputContainer.querySelector('.api-param-input[data-parameter="url"]');
        modeSelect?.addEventListener('change', () => {
            if (urlInput) {
                urlInput.value = '';
                urlInput.placeholder = isYoutube
                    ? 'Masukkan link YouTube lagi untuk format ini'
                    : isInstagram ? 'Masukkan link Instagram lagi untuk format ini' : 'Masukkan link TikTok lagi untuk format ini';
            }
            if (isYoutube) {
                metadataRequestId++;
                clearTimeout(metadataTimer);
                if (qualityGroup) qualityGroup.style.display = 'none';
                youtubePreviewGroup?.classList.add('d-none');
                if (executeButton) executeButton.disabled = true;
                const status = document.getElementById('yt-quality-status');
                if (status) status.textContent = 'Masukkan link YouTube untuk memuat informasi video.';
            }
            const responseContent = document.getElementById('apiResponseContent');
            if (responseContent) {
                responseContent.innerHTML = '';
                responseContent.classList.add('d-none');
            }
        });
    }

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
        const isYoutubeFileRoute = value.startsWith('/download/youtube/file?');
        const looksLikeMedia = /[.](mp3|mp4|m4a|webm|mkv|jpg|jpeg|png)(?:[?#]|$)/i.test(value);
        const downloadContext = /(download|video|audio|mp3|mp4|file|link|url)/i.test(label);
        if (isHttpUrl && (isYoutubeFileRoute || looksLikeMedia || downloadContext) && !/(thumbnail|avatar|cover|image)/i.test(label)) {
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
        caption: findValue(metadata, /^(caption|description|desc|sharetext|share_text)$/i),
        thumbnail: findValue(metadata, /(thumbnail|thumb|image|cover)/i),
        duration: metadata?.duration || metadata?.timestamp || findValue(metadata, /(duration|timestamp|length)/i),
        author: metadata?.author?.name || metadata?.author || metadata?.channel || ''
    };
}

function renderApiResult(container, data, mode, quality, item = activeApiItem) {
    container.innerHTML = '';
    if (mode === 'video' || mode === 'audio') {
        const info = findMediaMetadata(data);
        // YouTube video preview is already shown above the form; avoid rendering it twice after processing.
        // Instagram MP3 results should show only the download action, without the green title/preview.
        const showResultThumbnail = item?.id !== 'youtube' && item?.id !== 'instagram';
        if (showResultThumbnail && info.thumbnail && (info.thumbnail.startsWith('https://') || info.thumbnail.startsWith('http://'))) {
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

    if (item?.id === 'instagram') {
        const result = data?.result || {};
        const selectedMode = mode || 'video';
        if (selectedMode !== 'audio') {
            const preview = document.createElement('section');
            preview.className = 'yt-video-preview';
            if (result.thumbnail && /^https?:\\/\\//i.test(result.thumbnail)) {
                const image = document.createElement('img');
                image.className = 'yt-video-thumbnail';
                image.src = result.thumbnail;
                image.alt = 'Thumbnail video Instagram';
                image.loading = 'lazy';
                image.referrerPolicy = 'no-referrer';
                preview.appendChild(image);
            }
            const info = document.createElement('div');
            info.className = 'yt-video-info';
            const title = document.createElement('h4');
            title.textContent = result.title || 'Instagram media';
            info.appendChild(title);
            const meta = document.createElement('p');
            meta.textContent = 'Video Instagram • MP4';
            info.appendChild(meta);
            preview.appendChild(info);
            container.appendChild(preview);
        }

        if (selectedMode === 'audio') {
            if (!result.audio?.url) {
                const note = document.createElement('p');
                note.className = 'small text-warning';
                note.textContent = 'Audio MP3 tidak tersedia untuk postingan ini.';
                container.appendChild(note);
                return;
            }
            const audioLink = document.createElement('a');
            audioLink.className = 'api-download-button';
            audioLink.href = result.audio.url;
            audioLink.setAttribute('download', '');
            audioLink.textContent = '⬇ Download MP3';
            container.appendChild(audioLink);
            return;
        }

        const qualities = Array.isArray(result.video) ? result.video : [];
        if (!qualities.length) {
            const note = document.createElement('p');
            note.className = 'small text-warning';
            note.textContent = 'Video MP4 tidak tersedia untuk postingan ini.';
            container.appendChild(note);
            return;
        }

        const qualityGroup = document.createElement('div');
        qualityGroup.className = 'mb-3 api-input-group';
        const qualityLabel = document.createElement('label');
        qualityLabel.className = 'form-label';
        qualityLabel.textContent = 'Resolusi video';
        const qualitySelect = document.createElement('select');
        qualitySelect.className = 'form-select';
        qualities.forEach((option, index) => {
            const choice = document.createElement('option');
            choice.value = String(index);
            choice.textContent = option.quality || (index === 0 ? 'Terbaik' : `Pilihan ${index + 1}`);
            qualitySelect.appendChild(choice);
        });
        qualityGroup.append(qualityLabel, qualitySelect);
        container.appendChild(qualityGroup);

        const downloadLink = document.createElement('a');
        downloadLink.className = 'api-download-button';
        downloadLink.setAttribute('download', '');
        const updateDownload = () => {
            const selected = qualities[Number(qualitySelect.value)] || qualities[0];
            downloadLink.href = selected.url;
            downloadLink.textContent = '⬇ Download di sini';
        };
        qualitySelect.addEventListener('change', updateDownload);
        updateDownload();
        container.appendChild(downloadLink);
        return;
    }

    if (item?.id === 'tiktok') {
        const result = data?.result || {};
        const selectedMode = mode || 'video';
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
        const postCaption = findMediaMetadata(data).caption;
        heading.textContent = postCaption || result.title || 'TikTok media';
        heading.classList.add('tiktok-post-caption');
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
            anchor.textContent = selectedMode === 'audio' ? '⬇ Download' : '⬇ Unduh ' + option.quality;
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
            anchor.textContent = mode === 'audio' ? '⬇ Download' : `⬇ Download Video ${link.label || (index + 1)}`;
            container.appendChild(anchor);
        });
    }
    // Keep provider/CDN URLs out of the visible result for successful media downloads.
    if ((mode === 'audio' || mode === 'video') && links.length) return;

    const details = document.createElement('details');
    details.className = 'api-raw-result';
    const summary = document.createElement('summary');
    summary.innerHTML = '<span class="api-raw-summary-icon" aria-hidden="true">{ }</span><span class="api-raw-summary-copy"><strong>Lihat detail respons API</strong><small>Data teknis • JSON response</small></span><span class="api-raw-summary-badge">COPY DIBATASI</span>';
    const panel = document.createElement('div');
    panel.className = 'api-raw-panel';
    const toolbar = document.createElement('div');
    toolbar.className = 'api-raw-toolbar';
    toolbar.innerHTML = '<span><i></i> RESPONSE DATA</span><span class="api-raw-format">JSON</span>';
    const pre = document.createElement('pre');
    pre.className = 'api-raw-content';
    pre.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    pre.setAttribute('aria-label', 'Detail respons API');
    panel.append(toolbar, pre);
    details.append(summary, panel);
    container.appendChild(details);

    // Discourage casual copying from this response panel. Browser DevTools/network
    // access cannot be prevented for data that is delivered to the client.
    const blockCopy = event => {
        event.preventDefault();
        if (event.clipboardData) event.clipboardData.setData('text/plain', '');
    };
    ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(type => {
        pre.addEventListener(type, blockCopy);
    });
    pre.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'x'].includes(event.key.toLowerCase())) {
            event.preventDefault();
        }
    });
    // The success acknowledgement is added by executeApiRequest only for Status API.
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
    const responseContent = document.getElementById('apiResponseContent');
    if (!executeButton || !responseContent) return;

    const item = activeApiItem;
    if (apiRequestInProgress) {
        let notice = responseContent.querySelector('.api-request-wait-notice');
        if (!notice) {
            notice = document.createElement('p');
            notice.className = 'api-request-wait-notice small text-warning';
            notice.setAttribute('role', 'status');
            responseContent.appendChild(notice);
        }
        notice.textContent = 'Permintaan sebelumnya masih diproses. Tunggu hingga selesai sebelum menjalankan API berikutnya.';
        responseContent.classList.remove('d-none');
        return;
    }
    {
        apiRequestInProgress = true;
        executeButton.disabled = true;
        executeButton.dataset.originalText = executeButton.textContent;
        executeButton.textContent = 'Memproses request...';
    }

    // Keep the response area to one current message/card; never stack old success or error notices.
    responseContent.textContent = '';

    // Snapshot the selected service and form values for this request.
    const requestSession = apiModalSession;
    const inputs = [...document.querySelectorAll('#apiQueryInputContainer .api-param-input')];
    const inputValues = inputs.map(input => ({
        parameter: input.dataset.parameter,
        value: input.value.trim()
    }));
    const requestCard = document.createElement('section');
    requestCard.className = 'api-request-result';
    requestCard.style.cssText = 'margin-top:1rem;padding:1rem;border:1px solid rgba(0,220,255,.2);border-radius:12px;background:rgba(3,12,24,.55);';
    const requestLoading = document.createElement('p');
    requestLoading.className = 'small text-info';
    requestLoading.textContent = 'Request sedang diproses. Mohon tunggu hingga selesai.';
    const requestBody = document.createElement('div');
    requestCard.append(requestLoading, requestBody);
    responseContent.appendChild(requestCard);
    responseContent.classList.remove('d-none');

    let responseStatus = null;
    let serverFailure = false;

    try {
        let url = new URL(item.path, window.location.origin);
        inputValues.forEach(input => { url.searchParams.set(input.parameter, input.value); });
        [...url.searchParams.entries()].forEach(([key, value]) => { if (!value) url.searchParams.delete(key); });

        let mode = '';
        let quality = '';
        if (item.id === 'youtube' || item.id === 'tiktok' || item.id === 'instagram') {
            mode = document.getElementById('yt-mode')?.value || 'video';
            quality = item.id === 'youtube' && mode === 'video'
                ? (document.getElementById('yt-quality')?.value || '360')
                : 'best';
            const videoUrl = url.searchParams.get('url');
            if (!videoUrl) throw new Error(item.id === 'youtube' ? 'Masukan link youtube yang valid.' : item.id === 'instagram' ? 'Masukkan link Instagram yang valid.' : 'Masukan link TikTok yang valid.');
            if (item.id === 'youtube') {
                let parsedVideoUrl;
                try {
                    parsedVideoUrl = new URL(videoUrl);
                } catch {
                    throw new Error('Masukkan URL video YouTube yang valid.');
                }
                if (!['http:', 'https:'].includes(parsedVideoUrl.protocol) ||
                    !/(^|\.)((youtube\.com)|(youtu\.be))$/i.test(parsedVideoUrl.hostname)) {
                    throw new Error('Masukkan link YouTube yang valid (youtube.com atau youtu.be).');
                }
                const selectedQuality = document.getElementById('yt-quality')?.value || '360';
                url = new URL(mode === 'audio' ? '/download/ytmp3' : '/download/ytdl-v2', window.location.origin);
                if (mode === 'video') url.searchParams.set('quality', selectedQuality);
            }
            url.searchParams.set('url', videoUrl);
        }

        for (const input of inputValues) {
            if (!input.value) throw new Error(`Kolom ${input.parameter} wajib diisi.`);
        }

        // YouTube MP3 conversion can take longer than ordinary API calls.
        const requestTimeout = item.id === 'youtube' && mode === 'audio' ? 180000 : 60000;
        const response = await fetch(url.href, { method: 'GET', headers: { Accept: 'application/json, text/plain, */*' }, signal: AbortSignal.timeout(requestTimeout) });
        responseStatus = response.status;
        serverFailure = response.status >= 500 || response.status === 429;
        const contentType = response.headers.get('content-type') || '';
        const raw = await response.text();
        let data;
        try { data = contentType.includes('json') || /^[\s]*[\[{]/.test(raw) ? JSON.parse(raw) : raw; }
        catch { data = raw; }

        if (!response.ok || data?.status === false) {
            // Client/input errors (4xx, except throttling) must not mark a healthy API red.
            // A 5xx/429 or an explicit provider/server failure is a technical failure.
            serverFailure = serverFailure || response.status >= 500 || response.status === 429 ||
                (response.status >= 200 && response.status < 300 && data?.status === false);
            throw new Error(`HTTP ${response.status}: ${typeof data === 'string' ? data : (data?.message || data?.error || JSON.stringify(data))}`);
        }
        if (requestSession !== apiModalSession) return;
        requestLoading.remove();
        renderApiResult(requestBody, data, mode, quality, item);
        if (item.id === 'status') {
            const accepted = document.createElement('div');
            accepted.className = 'api-response-accepted';
            accepted.innerHTML = '<span class="api-response-accepted-dot" aria-hidden="true"></span><span><strong>Respons diterima</strong><small>Status API berhasil merespons server.</small></span>';
            requestBody.prepend(accepted);
        }
        setApiHealth(item.id || item.name, true);
    } catch (error) {
        if (requestSession !== apiModalSession) return;
        requestLoading.remove();
        const message = document.createElement('p');
        message.className = 'api-error-message';
        message.textContent = error.name === 'TimeoutError' ? 'Request timeout. Coba lagi beberapa saat.' : cleanApiErrorMessage(error.message);
        requestBody.appendChild(message);
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
        {
            apiRequestInProgress = false;
            executeButton.disabled = false;
            executeButton.textContent = executeButton.dataset.originalText || 'Execute Request';
            delete executeButton.dataset.originalText;
        }
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
    const executeButton = document.getElementById('submitQueryBtn');
    if (executeButton) executeButton.disabled = false;
}
