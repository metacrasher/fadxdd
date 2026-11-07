
document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const body = document.body;

    body.classList.add('no-scroll');

    try {
        // =====================================
        // LOAD SETTINGS
        // =====================================

        const response = await fetch('/src/settings.json');

        if (!response.ok) {
            throw new Error(`Failed to load settings: ${response.status}`);
        }

        const settings = await response.json();

        const setContent = (id, property, value) => {
            const element = document.getElementById(id);
            if (element) element[property] = value;
        };

        setContent('page', 'textContent', settings.name || 'FadXD API');
        setContent(
            'wm',
            'textContent',
            `© ${new Date().getFullYear()} ${settings.apiSettings?.creator || 'FadXD'}. All rights reserved.`
        );

        setContent('header', 'textContent', settings.name || 'FadXD API');
        setContent('name', 'textContent', settings.name || 'FadXD API');
        setContent('version', 'textContent', settings.version || 'v1.0');
        setContent(
            'versionHeader',
            'textContent',
            settings.header?.status || 'Active!'
        );
        setContent(
            'description',
            'textContent',
            settings.description || 'Professional API Services'
        );

        // =====================================
        // API LINKS
        // =====================================

        const apiLinksContainer = document.getElementById('apiLinks');

        if (apiLinksContainer && Array.isArray(settings.links)) {
            apiLinksContainer.innerHTML = '';

            settings.links.forEach(({ url, name }) => {
                if (!url || !name) return;

                const link = document.createElement('a');

                link.href = url;
                link.textContent = name;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'api-link';

                apiLinksContainer.appendChild(link);
            });
        }

        // =====================================
        // RENDER API CATEGORIES
        // =====================================

        const apiContent = document.getElementById('apiContent');

        if (!apiContent) {
            throw new Error('Element #apiContent not found.');
        }

        apiContent.innerHTML = '';

        const categories = Array.isArray(settings.categories)
            ? settings.categories
            : [];

        categories.forEach((category, categoryIndex) => {
            const items = Array.isArray(category.items)
                ? [...category.items]
                : [];

            items.sort((a, b) =>
                String(a.name || '').localeCompare(String(b.name || ''))
            );

            if (!items.length) return;

            const section = document.createElement('section');
            section.className = 'api-category mb-5';
            section.dataset.category = category.name || '';

            // CATEGORY HEADER

            const heading = document.createElement('div');
            heading.className = 'category-heading mb-3';

            const categoryTitle = document.createElement('h3');
            categoryTitle.className = 'category-header';
            categoryTitle.textContent = category.name || 'Other APIs';

            const categoryCount = document.createElement('span');
            categoryCount.className = 'category-count';
            categoryCount.textContent = `${items.length} ENDPOINT${items.length !== 1 ? 'S' : ''}`;

            heading.appendChild(categoryTitle);
            heading.appendChild(categoryCount);

            // API GRID

            const row = document.createElement('div');
            row.className = 'row g-3 api-grid';

            items.forEach(item => {
                const column = document.createElement('div');

                column.className = 'col-md-6 col-lg-4 api-item';
                column.dataset.name = item.name || '';
                column.dataset.desc = item.desc || '';

                const card = document.createElement('div');
                card.className = 'hero-section api-card h-100';

                // CARD TOP

                const cardTop = document.createElement('div');
                cardTop.className = 'api-card-top';

                const icon = document.createElement('div');
                icon.className = 'api-card-icon';
                icon.innerHTML = `
                    <svg width="21" height="21" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor"
                        stroke-width="1.8" stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M12 2v20M2 12h20"/>
                        <circle cx="12" cy="12" r="8"/>
                    </svg>
                `;

                const method = document.createElement('span');
                method.className = 'api-method';
                method.textContent = 'GET';

                cardTop.appendChild(icon);
                cardTop.appendChild(method);

                // CARD CONTENT

                const content = document.createElement('div');
                content.className = 'api-card-content';

                const title = document.createElement('h5');
                title.className = 'api-card-title';
                title.textContent = item.name || 'Unnamed API';

                const description = document.createElement('p');
                description.className = 'api-card-description';
                description.textContent = item.desc || 'No description available.';

                content.appendChild(title);
                content.appendChild(description);

                // CARD FOOTER

                const footer = document.createElement('div');
                footer.className = 'api-card-footer';

                const endpointLabel = document.createElement('span');
                endpointLabel.className = 'api-endpoint-label';
                endpointLabel.textContent = 'API ENDPOINT';

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'btn btn-dark btn-sm get-api-btn';

                button.dataset.apiPath = item.path || '';
                button.dataset.apiName = item.name || '';
                button.dataset.apiDesc = item.desc || '';

                button.innerHTML = `
                    <span>Execute</span>
                    <span class="button-arrow">↗</span>
                `;

                footer.appendChild(endpointLabel);
                footer.appendChild(button);

                card.appendChild(cardTop);
                card.appendChild(content);
                card.appendChild(footer);

                column.appendChild(card);
                row.appendChild(column);
            });

            section.appendChild(heading);
            section.appendChild(row);

            apiContent.appendChild(section);
        });

        // =====================================
        // SEARCH SYSTEM
        // =====================================

        const searchInput = document.getElementById('searchInput');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value
                    .trim()
                    .toLowerCase();

                document.querySelectorAll('.api-category').forEach(section => {
                    const items = section.querySelectorAll('.api-item');

                    let visibleCount = 0;

                    items.forEach(item => {
                        const name = (item.dataset.name || '').toLowerCase();
                        const desc = (item.dataset.desc || '').toLowerCase();

                        const matches =
                            name.includes(searchTerm) ||
                            desc.includes(searchTerm);

                        item.hidden = !matches;

                        if (matches) visibleCount++;
                    });

                    section.hidden = visibleCount === 0;

                    const count = section.querySelector('.category-count');

                    if (count) {
                        count.textContent =
                            `${visibleCount} RESULT${visibleCount !== 1 ? 'S' : ''}`;
                    }
                });
            });
        }

        // =====================================
        // API MODAL SYSTEM
        // =====================================

        const modalElement = document.getElementById('apiResponseModal');

        if (!modalElement) {
            throw new Error('API modal not found.');
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

        const modalRefs = {
            label: document.getElementById('apiResponseModalLabel'),
            desc: document.getElementById('apiResponseModalDesc'),
            content: document.getElementById('apiResponseContent'),
            endpoint: document.getElementById('apiEndpoint'),
            spinner: document.getElementById('apiResponseLoading'),
            queryInputContainer: document.getElementById('apiQueryInputContainer'),
            submitBtn: document.getElementById('submitQueryBtn')
        };

        let activeRequest = null;
        let currentImageUrl = null;

        const releaseImage = () => {
            if (currentImageUrl) {
                URL.revokeObjectURL(currentImageUrl);
                currentImageUrl = null;
            }
        };

        const resetModal = () => {
            releaseImage();

            modalRefs.content.innerHTML = '';
            modalRefs.content.classList.add('d-none');

            modalRefs.endpoint.textContent = '';
            modalRefs.endpoint.classList.add('d-none');

            modalRefs.spinner.classList.add('d-none');

            modalRefs.queryInputContainer.innerHTML = '';

            modalRefs.submitBtn.classList.add('d-none');
            modalRefs.submitBtn.disabled = false;

            if (activeRequest) {
                activeRequest.abort();
                activeRequest = null;
            }
        };

        // =====================================
        // OPEN API MODAL
        // =====================================

        document.addEventListener('click', event => {
            const button = event.target.closest('.get-api-btn');

            if (!button) return;

            const {
                apiPath,
                apiName,
                apiDesc
            } = button.dataset;

            if (!apiPath) return;

            resetModal();

            modalRefs.label.textContent = apiName || 'API Request';
            modalRefs.desc.textContent = apiDesc || '';

            const basePath = apiPath.split('?')[0];

            const params = new URLSearchParams(
                apiPath.split('?')[1] || ''
            );

            const hasParams = Array.from(params.keys()).length > 0;

            // PARAMETER INPUTS

            if (hasParams) {
                const paramContainer = document.createElement('div');
                paramContainer.className = 'param-container';

                const paramHeading = document.createElement('div');
                paramHeading.className = 'param-heading';
                paramHeading.textContent = 'REQUEST PARAMETERS';

                paramContainer.appendChild(paramHeading);

                const paramsArray = Array.from(params.keys());

                paramsArray.forEach(param => {
                    const group = document.createElement('div');
                    group.className = 'param-group mb-3';

                    const label = document.createElement('label');
                    label.className = 'param-label';
                    label.textContent = param;

                    const input = document.createElement('input');

                    input.type = 'text';
                    input.className = 'form-control';
                    input.placeholder = `Enter ${param}...`;
                    input.dataset.param = param;
                    input.required = true;

                    input.addEventListener('input', validateInputs);

                    group.appendChild(label);
                    group.appendChild(input);

                    paramContainer.appendChild(group);
                });

                const currentItem = categories
                    .flatMap(category => category.items || [])
                    .find(item => item.path === apiPath);

                if (currentItem?.innerDesc) {
                    const innerDesc = document.createElement('div');

                    innerDesc.className = 'api-inner-description';
                    innerDesc.style.fontSize = '12px';

                    // Preserve newlines without injecting HTML.
                    innerDesc.textContent = currentItem.innerDesc;

                    paramContainer.appendChild(innerDesc);
                }

                modalRefs.queryInputContainer.appendChild(paramContainer);

                modalRefs.submitBtn.classList.remove('d-none');
                modalRefs.submitBtn.disabled = true;

                modalRefs.submitBtn.onclick = () => {
                    const inputs = paramContainer.querySelectorAll('input');
                    const newParams = new URLSearchParams();

                    let isValid = true;

                    inputs.forEach(input => {
                        const value = input.value.trim();

                        if (!value) {
                            isValid = false;
                            input.classList.add('is-invalid');
                        } else {
                            input.classList.remove('is-invalid');
                            newParams.append(input.dataset.param, value);
                        }
                    });

                    if (!isValid) return;

                    const apiUrl = `${window.location.origin}${basePath}?${newParams.toString()}`;

                    modalRefs.queryInputContainer.innerHTML = '';
                    modalRefs.submitBtn.classList.add('d-none');

                    handleApiRequest(apiUrl, apiName);
                };

            } else {
                // DIRECT REQUEST

                handleApiRequest(
                    `${window.location.origin}${apiPath}`,
                    apiName
                );
            }

            modal.show();
        });

        // =====================================
        // VALIDATE PARAMETERS
        // =====================================

        function validateInputs() {
            const inputs = modalRefs.queryInputContainer.querySelectorAll('input');

            const isValid = Array.from(inputs).every(input =>
                input.value.trim() !== ''
            );

            modalRefs.submitBtn.disabled = !isValid;
        }

        // =====================================
        // EXECUTE API REQUEST
        // =====================================

        async function handleApiRequest(apiUrl, apiName) {
            if (activeRequest) {
                activeRequest.abort();
            }

            const controller = new AbortController();
            activeRequest = controller;

            releaseImage();

            modalRefs.spinner.classList.remove('d-none');
            modalRefs.content.classList.add('d-none');

            modalRefs.content.innerHTML = '';
            modalRefs.endpoint.classList.add('d-none');

            try {
                const response = await fetch(apiUrl, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('Content-Type') || '';

                // IMAGE RESPONSE

                if (contentType.startsWith('image/')) {
                    const blob = await response.blob();

                    currentImageUrl = URL.createObjectURL(blob);

                    const image = document.createElement('img');

                    image.src = currentImageUrl;
                    image.alt = apiName || 'API Image Result';
                    image.className = 'api-result-image';

                    image.style.maxWidth = '100%';
                    image.style.height = 'auto';
                    image.style.display = 'block';
                    image.style.margin = '0 auto';
                    image.style.borderRadius = '10px';

                    modalRefs.content.innerHTML = '';
                    modalRefs.content.appendChild(image);

                } else {
                    // JSON / TEXT RESPONSE

                    const rawData = await response.text();

                    let formattedData;

                    try {
                        const data = JSON.parse(rawData);
                        formattedData = JSON.stringify(data, null, 2);
                    } catch {
                        formattedData = rawData;
                    }

                    modalRefs.content.textContent = formattedData;
                }

                modalRefs.endpoint.textContent = apiUrl;
                modalRefs.endpoint.classList.remove('d-none');

            } catch (error) {
                if (error.name === 'AbortError') return;

                modalRefs.content.textContent =
                    `Request Failed\n\n${error.message}`;

                modalRefs.content.classList.add('api-error');
            } finally {
                if (activeRequest === controller) {
                    activeRequest = null;
                    modalRefs.spinner.classList.add('d-none');
                    modalRefs.content.classList.remove('d-none');
                }
            }
        }

        // =====================================
        // MODAL CLEANUP
        // =====================================

        modalElement.addEventListener('hidden.bs.modal', () => {
            resetModal();
            modalRefs.content.classList.remove('api-error');
        });

    } catch (error) {
        console.error('Error loading API settings:', error);

        if (loadingScreen) {
            loadingScreen.textContent = 'Unable to load API configuration.';
        }

    } finally {
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }

            body.classList.remove('no-scroll');
        }, 1500);
    }
});

// =====================================
// NAVBAR SCROLL
// =====================================

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');

    if (!navbar) return;

    navbar.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });
