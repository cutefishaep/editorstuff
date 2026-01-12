document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('list-container');
    const statusText = document.getElementById('status-text');
    const sidebarItems = document.querySelectorAll('.nav-item');
    const confirmBtn = document.getElementById('confirm-btn');
    const downloadWindow = document.getElementById('download-window');
    const downloadList = document.getElementById('download-list');
    const closeBtns = document.querySelectorAll('.close-modal');
    const searchInput = document.getElementById('search-input');

    let softwareList = [];
    let currentCategory = 'SOFTWARE';
    let searchQuery = '';
    let currentSlideIndex = 0;

    // Fetch data
    Promise.all([
        fetch('list_win.json').then(res => res.json()),
        fetch('list_presets.json').then(res => res.json())
    ])
        .then(([winData, presetData]) => {
            const filteredWin = winData.filter(item => item.category !== 'PRESET');
            softwareList = [...filteredWin, ...presetData].map(item => ({
                ...item,
                id: String(item.id), // String IDs for stability
                selected: false
            }));
            renderList();
        })
        .catch(error => console.error('Error loading lists:', error));

    function getFilteredList() {
        return softwareList.filter(item => {
            const matchesSearch = item.filename.toLowerCase().includes(searchQuery.toLowerCase());
            if (searchQuery) return matchesSearch;

            if (currentCategory === 'PRESET') {
                return ['PRESET', 'PROJECT', 'PACK'].includes(item.category);
            }
            return item.category === currentCategory;
        });
    }

    function renderList() {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        const filteredList = getFilteredList();
        const isPreset = currentCategory === 'PRESET' && !searchQuery;

        const listHeader = document.querySelector('.list-header');
        if (!listHeader) return;

        if (isPreset) {
            listHeader.style.display = 'none';
            listContainer.className = 'preset-slider-container';

            if (filteredList.length === 0) {
                listContainer.innerHTML = '<div style="color:var(--text-secondary);">No presets found.</div>';
            } else {
                if (currentSlideIndex >= filteredList.length) currentSlideIndex = 0;
                const item = filteredList[currentSlideIndex];

                const isVideo = item.preview && (item.preview.endsWith('.mp4') || item.preview.endsWith('.webm'));
                const previewHtml = item.preview ? (
                    isVideo ? `<video src="${item.preview}" muted loop onmouseover="this.play()" onmouseout="this.pause(); this.currentTime=0;"></video>`
                        : `<img src="${item.preview}" alt="${item.filename}">`
                ) : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a;"><i class="fa-solid fa-file-presets" style="font-size:80px; color:rgba(255,255,255,0.05)"></i></div>`;

                const sliderHtml = `
                    <button class="nav-arrow left ${currentSlideIndex === 0 ? 'disabled' : ''}" id="prev-slide"><i class="fa-solid fa-chevron-left"></i></button>
                    <div class="preset-slider">
                        <div class="preset-card-large ${item.selected ? 'selected' : ''}" id="current-card">
                            <div class="selection-overlay"></div>
                            <div class="check-indicator"><i class="fa-solid fa-circle-check"></i></div>
                            <div class="card-half-media">${previewHtml}</div>
                            <div class="card-half-info">
                                <div class="card-name">${item.filename}</div>
                                <div class="info-item">
                                    <span class="info-label">Category</span>
                                    <span class="info-value">${item.category}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Min (AE)</span>
                                    <span class="info-value">AE ${item.os_min}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Type</span>
                                    <span class="info-value">${(item.originalName || "").split('.').pop().toUpperCase() || 'ZIP'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Size</span>
                                    <span class="info-value">${item.size || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button class="nav-arrow right ${currentSlideIndex === filteredList.length - 1 ? 'disabled' : ''}" id="next-slide"><i class="fa-solid fa-chevron-right"></i></button>
                `;

                listContainer.innerHTML = sliderHtml;

                document.getElementById('prev-slide').onclick = (e) => {
                    e.stopPropagation();
                    if (currentSlideIndex > 0) {
                        currentSlideIndex--;
                        renderList();
                    }
                };
                document.getElementById('next-slide').onclick = (e) => {
                    e.stopPropagation();
                    if (currentSlideIndex < filteredList.length - 1) {
                        currentSlideIndex++;
                        renderList();
                    }
                };
                document.getElementById('current-card').onclick = () => {
                    toggleItem(item.id, !item.selected);
                };
            }
        } else {
            listHeader.style.display = 'grid';
            listContainer.className = 'list-scroll-area';
            listHeader.innerHTML = `
                <div class="col-check"><input type="checkbox" id="select-all"></div>
                <div class="col-name">Name</div>
                <div class="col-os">Windows</div>
                <div class="col-size">Size</div>
            `;

            const selectAllBtn = document.getElementById('select-all');
            if (selectAllBtn) {
                selectAllBtn.checked = filteredList.length > 0 && filteredList.every(i => i.selected);
                selectAllBtn.indeterminate = filteredList.some(i => i.selected) && !selectAllBtn.checked;

                selectAllBtn.onchange = (e) => {
                    filteredList.forEach(item => { item.selected = e.target.checked; });
                    renderList();
                };
            }

            filteredList.forEach((item) => {
                const row = document.createElement('div');
                row.className = `win-row ${item.selected ? 'selected' : ''}`;
                row.innerHTML = `
                    <div class="col-check"><input type="checkbox" class="win-checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''}></div>
                    <div class="col-name">${item.filename}</div>
                    <div class="col-os">${item.os_min}</div>
                    <div class="col-size">${item.size}</div>
                `;

                row.onclick = (e) => {
                    if (e.target.type !== 'checkbox') {
                        toggleItem(item.id, !item.selected);
                    }
                };

                const checkbox = row.querySelector('.win-checkbox');
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                    toggleItem(item.id, e.target.checked);
                };

                listContainer.appendChild(row);
            });
        }
        updateStatus();
    }

    function toggleItem(id, isSelected) {
        const item = softwareList.find(i => i.id === id);
        if (item) {
            item.selected = isSelected;
            renderList();
        }
    }

    function updateStatus() {
        if (statusText) {
            const count = softwareList.filter(i => i.selected).length;
            statusText.textContent = `${count} selected`;
        }
    }

    sidebarItems.forEach(item => {
        item.onclick = () => {
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentCategory = item.getAttribute('data-category');
            currentSlideIndex = 0;
            renderList();
        };
    });

    if (searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value.trim();
            currentSlideIndex = 0;
            renderList();
        };
    }

    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const selectedItems = softwareList.filter(i => i.selected);
            if (selectedItems.length === 0) return;

            downloadList.innerHTML = '';
            selectedItems.forEach(item => {
                const row = document.createElement('div');
                row.className = 'download-item';

                let buttonsHtml = '';
                for (let i = 1; i <= 10; i++) {
                    const link = item[`link${i}`];
                    if (link) {
                        buttonsHtml += `
                            <button class="win11-btn primary small" onclick="window.open('${link}', '_blank')">Mirror ${i}</button>
                        `;
                    }
                }

                let instructionHtml = '';
                if (item.instruction || item.instructions) {
                    instructionHtml = `
                        <button class="win11-btn secondary small" style="border:1px solid var(--accent-color); color:var(--accent-color);" 
                            onclick="showInstruction('${item.id}')">How to Install?</button>
                    `;
                }

                row.innerHTML = `
                    <div style="font-weight: 500; font-size: 14px;">${item.filename}</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                        ${instructionHtml}
                        ${buttonsHtml}
                    </div>
                `;
                downloadList.appendChild(row);
            });
            downloadWindow.style.display = 'flex';
        };
    }

    window.showInstruction = (id) => {
        const item = softwareList.find(i => i.id === id);
        if (!item) return;
        const modal = document.getElementById('instruction-modal');
        document.getElementById('inst-title').innerText = item.filename;
        document.getElementById('inst-content').innerText = item.instruction || item.instructions || 'No instructions available.';
        modal.style.display = 'flex';
    };

    window.closeInstruction = () => {
        document.getElementById('instruction-modal').style.display = 'none';
    };

    closeBtns.forEach(btn => btn.onclick = () => downloadWindow.style.display = 'none');

    const copyPassBtn = document.getElementById('copy-pass-btn-win');
    if (copyPassBtn) {
        copyPassBtn.onclick = () => {
            navigator.clipboard.writeText('EDITINGSTUFF');
            const icon = copyPassBtn.querySelector('i');
            icon.className = 'fa-solid fa-check';
            setTimeout(() => icon.className = 'fa-regular fa-clipboard', 2000);
        };
    }

    // Window Management
    const win = document.querySelector('.win11-window');
    const minBtn = document.querySelector('.control-btn.minimize');
    const maxBtn = document.querySelector('.control-btn.maximize');
    const closeBtn = document.querySelector('.control-btn.close');
    const restoreBtn = document.getElementById('restore-win-btn');
    const taskbar = document.getElementById('win-taskbar');

    if (minBtn) minBtn.onclick = () => { win.classList.add('minimized'); if (taskbar) taskbar.classList.add('active'); };
    if (maxBtn) maxBtn.onclick = () => { win.classList.toggle('maximized'); };
    if (closeBtn) closeBtn.onclick = () => location.href = 'index.html';
    if (restoreBtn) restoreBtn.onclick = () => { win.classList.remove('minimized'); if (taskbar) taskbar.classList.remove('active'); };
});
