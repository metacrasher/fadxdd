
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
        count.textContent = `${category.items.length} ENDPOINTS`;

        heading.append(title, count);

        const grid = document.createElement('div');
        grid.className = 'api-grid';

        const sortedItems = [...category.items].sort((a, b) =>
            String(a.name || '').localeCompare(String(b.name || ''))
        );

        sortedItems.forEach(item => {
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
            method.textContent = 'GET';

            const endpointName = document.createElement('h4');
            endpointName.className = 'api-item-name';
            endpointName.textContent = item.name || 'Unnamed Endpoint';

            top.append(method, endpointName);

            const description = document.createElement('p');
            description.className = 'api-item-desc';
            description.textContent = item.desc || 'No description available.';

            const path = document.createElement('code');
            path.className = 'api-item-path';
            path.textContent = item.path;

            const footer = document.createElement('div');
            footer.className = 'api-item-footer';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'api-open-button';
            button.textContent = 'Try Endpoint';

            button.addEventListener('click', () => {
                openApiModal(item);
            });

            footer.appendChild(button);

            card.append(top, description, path);

            if (item.innerDesc) {
                const note = document.createElement('small');
                note.className = 'api-item-note';
                note.textContent = item.innerDesc;
                card.appendChild(note);
            }

            card.appendChild(footer);
            grid.appendChild(card);
        });

        section.append(heading, grid);
        container.appendChild(section);
    });
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

    title.textContent = item.name || 'API Endpoint';
    description.textContent = item.desc || '';
    endpoint.textContent = item.path || '';

    inputContainer.innerHTML = '';

    if (responseContent) {
        responseContent.textContent = '';
        responseContent.classList.add('d-none');
    }

    const parsedUrl = new URL(item.path, window.location.origin);
    const parameters = [...parsedUrl.searchParams.keys()];

    if (parameters.length === 0) {
        const note = document.createElement('p');
        note.className = 'small text-secondary';
        note.textContent = 'This endpoint does not require query parameters.';
        inputContainer.appendChild(note);
    } else {
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
            input.placeholder = `Enter ${parameter}...`;
            input.autocomplete = 'off';

            group.append(label, input);
            inputContainer.appendChild(group);
        });
    }

    if (apiModalInstance) {
        apiModalInstance.show();
    }
}


/* =========================================
   EXECUTE API REQUEST
========================================= */

async function executeApiRequest() {
    if (!activeApiItem) return;

    const executeButton = document.getElementById('submitQueryBtn');
    const loading = document.getElementById('apiResponseLoading');
    const responseContent = document.getElementById('apiResponseContent');

    if (!executeButton || !responseContent) return;

    const originalButtonText = executeButton.textContent;

    executeButton.disabled = true;
    executeButton.textContent = 'Processing...';

    if (loading) loading.classList.remove('d-none');

    responseContent.classList.add('d-none');
    responseContent.textContent = '';

    try {
        const url = new URL(activeApiItem.path, window.location.origin);

        document.querySelectorAll(
            '#apiQueryInputContainer .api-param-input'
        ).forEach(input => {
            url.searchParams.set(
                input.dataset.parameter,
                input.value.trim()
            );
        });

        // Avoid sending empty parameters
        [...url.searchParams.entries()].forEach(([key, value]) => {
            if (value === '') {
                url.searchParams.delete(key);
            }
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        let response;

        try {
            response = await fetch(url.href, {
                method: 'GET',
                headers: {
                    Accept: 'application/json, text/plain, */*'
                },
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        const contentType = response.headers.get('content-type') || '';

        responseContent.classList.remove('d-none');

        if (contentType.includes('image/')) {
            const image = document.createElement('img');
            image.src = url.href;
            image.alt = 'API response';
            image.style.maxWidth = '100%';
            image.style.height = 'auto';
            responseContent.textContent = '';
            responseContent.appendChild(image);
        } else {
            const resultText = await response.text();

            try {
                const json = JSON.parse(resultText);
                responseContent.textContent = JSON.stringify(json, null, 2);
            } catch {
                responseContent.textContent = resultText || '(Empty response)';
            }
        }

        if (!response.ok) {
            responseContent.textContent =
                `HTTP ${response.status} ${response.statusText}\n\n` +
                responseContent.textContent;
        }

    } catch (error) {
        responseContent.classList.remove('d-none');

        responseContent.textContent = error.name === 'AbortError'
            ? 'Request timeout: API tidak merespons selama 30 detik.'
            : `Request failed: ${error.message}`;

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
