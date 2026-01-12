(function () {
    const listContainer = document.getElementById('list-container');
    const selectedCount = document.getElementById('selected-count');
    const searchInput = document.getElementById('search-input');
    const menuItems = document.querySelectorAll('.menu-item');
    const confirmBtn = document.getElementById('confirm-btn');

    let softwareList = [];
    let currentCategory = 'SOFTWARE';
    let searchQuery = '';
    let currentSlideIndex = 0;

    const osMapping = {
        "10": "High Sierra",
        "10.13": "High Sierra",
        "10.14": "Mojave",
        "10.15": "Catalina",
        "11": "Big Sur",
        "12": "Monterey",
        "13": "Ventura",
        "14": "Sonoma",
        "15": "Sequoia"
    };

    function getOsDisplay(minOs) {
        return osMapping[minOs] || `macOS ${minOs}+`;
    }

    // Load Data
    Promise.all([
        fetch('list_mac.json').then(res => res.json()),
        fetch('list_presets.json').then(res => res.json())
    ])
        .then(([macData, presetData]) => {
            const filteredMac = macData.filter(item => item.category !== 'PRESET');
            softwareList = [...filteredMac, ...presetData].map(item => ({
                ...item,
                id: String(item.id),
                selected: false
            }));
            renderList();
        })
        .catch(err => console.error('Data load error:', err));

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
                listContainer.innerHTML = '<div style="color:var(--text-secondary); padding:20px;">No presets found.</div>';
            } else {
                if (currentSlideIndex >= filteredList.length) currentSlideIndex = 0;
                const item = filteredList[currentSlideIndex];

                const isVideo = item.preview && (item.preview.endsWith('.mp4') || item.preview.endsWith('.webm'));
                const previewHtml = item.preview ? (
                    isVideo ? `<video src="${item.preview}" muted loop onmouseover="this.play()" onmouseout="this.pause(); this.currentTime=0;"></video>`
                        : `<img src="${item.preview}" alt="${item.filename}">`
                ) : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#1a1a1a;"><i class="fa-solid fa-file-presets" style="font-size:80px; color:rgba(255,255,255,0.05)"></i></div>`;

                const sliderHtml = `
                    <button class="nav-arrow left ${currentSlideIndex === 0 ? 'disabled' : ''}" id="prev-slide">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <div class="slider-content">
                        <div class="preset-card-large ${item.selected ? 'selected' : ''}" id="current-card">
                            <div class="selection-overlay"></div>
                            <div class="check-indicator"><i class="fa-solid fa-circle-check"></i></div>
                            <div class="card-half-media">${previewHtml}</div>
                            <div class="card-half-info">
                                <div class="card-title-large">${item.filename}</div>
                                <div class="info-grid-large">
                                    <div class="info-row-large">
                                        <span class="label">Min (AE)</span>
                                        <span class="value">AE ${item.os_min}</span>
                                    </div>
                                    <div class="info-row-large">
                                        <span class="label">Size</span>
                                        <span class="value">${item.size || '-'}</span>
                                    </div>
                                    <div class="info-row-large">
                                        <span class="label">Type</span>
                                        <span class="value">${(item.originalName || "").split('.').pop().toUpperCase() || 'ZIP'}</span>
                                    </div>
                                    <div class="info-row-large">
                                        <span class="label">Category</span>
                                        <span class="value">${item.category}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button class="nav-arrow right ${currentSlideIndex === filteredList.length - 1 ? 'disabled' : ''}" id="next-slide">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                `;

                listContainer.innerHTML = sliderHtml;

                // Navigation Logic
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
            listContainer.className = 'list-container';
            listHeader.innerHTML = `
                <div class="col-checkbox"><input type="checkbox" id="select-all"></div>
                <div class="col-name">Name</div>
                <div class="col-os">Min OS</div>
                <div class="col-size">Size</div>
            `;

            const selectAllBtn = document.getElementById('select-all');
            if (selectAllBtn) {
                const allSelected = filteredList.length > 0 && filteredList.every(i => i.selected);
                selectAllBtn.checked = allSelected;
                const someSelected = filteredList.some(i => i.selected);
                selectAllBtn.indeterminate = someSelected && !allSelected;

                selectAllBtn.onclick = (e) => {
                    const isChecked = e.target.checked;
                    filteredList.forEach(item => item.selected = isChecked);
                    renderList();
                };
            }

            filteredList.forEach(item => {
                const row = document.createElement('div');
                row.className = `list-row ${item.selected ? 'selected' : ''}`;
                row.innerHTML = `
                    <div class="col-checkbox"><input type="checkbox" class="item-checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''}></div>
                    <div class="col-name">${item.filename}</div>
                    <div class="col-os">${getOsDisplay(item.os_min)}</div>
                    <div class="col-size">${item.size}</div>
                `;

                row.onclick = (e) => {
                    if (e.target.type !== 'checkbox') {
                        toggleItem(item.id, !item.selected);
                    }
                };

                const checkbox = row.querySelector('.item-checkbox');
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                    toggleItem(item.id, e.target.checked);
                };

                listContainer.appendChild(row);
            });
        }
        updateSummary();
    }

    function toggleItem(id, isSelected) {
        const item = softwareList.find(i => i.id === id);
        if (item) {
            item.selected = isSelected;
            renderList();
        }
    }

    function updateSummary() {
        if (selectedCount) {
            const count = softwareList.filter(i => i.selected).length;
            selectedCount.textContent = count;
        }
    }

    menuItems.forEach(item => {
        item.onclick = () => {
            menuItems.forEach(m => m.classList.remove('active'));
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
            const selected = softwareList.filter(i => i.selected);
            if (selected.length === 0) return;
            showDownloadModal(selected);
        };
    }

    function showDownloadModal(items) {
        const overlay = document.getElementById('download-overlay');
        const list = document.getElementById('download-list');
        if (!list || !overlay) return;

        list.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'download-item';

            let linksHtml = '';
            for (let i = 1; i <= 10; i++) {
                const link = item[`link${i}`];
                if (link) {
                    linksHtml += `<button class="btn-primary mini" onclick="window.open('${link}', '_blank')">Mirror ${i}</button>`;
                }
            }

            div.innerHTML = `
                <div class="dl-info">
                   <div class="dl-name">${item.filename}</div>
                   <div class="dl-meta" style="font-size: 11px; color: var(--text-secondary);">${item.size} • Mac</div>
                </div>
                <div class="dl-actions" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 60%;">
                    <button class="btn-secondary mini" onclick="showInstruction('${item.id}')"><i class="fa-solid fa-circle-info"></i> Guide</button>
                    ${linksHtml}
                </div>
            `;
            list.appendChild(div);
        });
        overlay.style.display = 'flex';
    }

    window.showInstruction = function (id) {
        const item = softwareList.find(i => i.id === String(id));
        if (!item) return;
        document.getElementById('mac-inst-title').textContent = item.filename + ' Guide';
        document.getElementById('mac-inst-content').innerText = item.instructions || item.instruction || 'No instructions available.';
        document.getElementById('instruction-overlay').style.display = 'flex';
    };

    window.closeInstruction = function () {
        document.getElementById('instruction-overlay').style.display = 'none';
    };

    const closeDlBtn = document.getElementById('close-download-btn');
    if (closeDlBtn) closeDlBtn.onclick = () => document.getElementById('download-overlay').style.display = 'none';

    const closeDlX = document.getElementById('close-download-x');
    if (closeDlX) closeDlX.onclick = () => document.getElementById('download-overlay').style.display = 'none';

    const copyBtn = document.getElementById('copy-pass-btn-mac');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText('EDITINGSTUFF');
            const icon = copyBtn.querySelector('i');
            icon.className = 'fa-solid fa-check';
            setTimeout(() => icon.className = 'fa-regular fa-clipboard', 2000);
        };
    }

    // Window Controls Logic
    const windowContainer = document.querySelector('.window-container');
    const closeLight = document.querySelector('.light.red');
    const minimizeLight = document.querySelector('.light.yellow');
    const maximizeLight = document.querySelector('.light.green');
    const restoreBtn = document.getElementById('restore-mac-btn');
    const dock = document.getElementById('mac-dock');

    if (closeLight) closeLight.onclick = () => location.href = 'index.html';
    if (minimizeLight) {
        minimizeLight.onclick = () => {
            windowContainer.classList.add('minimized');
            if (dock) dock.classList.add('active');
        };
    }
    if (maximizeLight) maximizeLight.onclick = () => windowContainer.classList.toggle('maximized');
    if (restoreBtn) {
        restoreBtn.onclick = () => {
            windowContainer.classList.remove('minimized');
            if (dock) dock.classList.remove('active');
        };
    }
})();
